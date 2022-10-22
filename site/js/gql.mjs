function cascadeFields() {
    const cascade = [];
    return {
        addField: (field) => { 
            if (!Array.isArray(field)) {
                field = [ field ];
            }
            field = field.map(JSON.stringify);
            cascade.push(...field);
        },
        stringify: () => { 
            const fields = cascade.length ? `( fields: [ ${cascade.join(", ")} ] )` : "";
            return `@cascade${fields}`
        }
    }
}

function selectionLiteral(lit) {
    return {
        stringify: () => lit
    };
}

export function gql_query(target) {
    const selector = [];
    const filter = [];
    let cascade;
    let alias;
    const targetObj = {
        stringify: () => target
    };

    const self = {
        alias: (newalias) => { 
            alias = { stringify: () => `${newalias}:` } ;
            return self;
        },
        cascade: () => { 
            cascade = cascadeFields(); 
            return self;
        },
        filter: () => {
            const filterobject = gql_filter();
            filter.push(filterobject);
            return filterobject;
        },
        selector: (sel, bCascade) => {
            if (!Array.isArray(sel)) {
                sel = [ sel ];
            }
            if (bCascade) {
                if (!cascade) {
                    self.cascade();
                }
                cascade.addField(sel);
            }
            
            sel = sel.map(selectionLiteral);
            selector.push(...sel);
            return self;
        },
        subSelector: (sel, bCascade) => {
            const q = gql_query(sel);

            selector.push(q);

            if (bCascade) {
                if (!cascade) {
                    self.cascade();
                }
                cascade.addField(sel);
            }

            return q;
        },
        stringify: () => { 
            const field = [alias, targetObj, filter, cascade]
                .flat()
                .filter((t) => t !== undefined)
                .map((t) => t.stringify())
                .join(" ");

            const sel = selector.map((t) => t.stringify()).join(" ");

            return `${field} { ${sel} }`;
        }
    };
    return self;
}

function filter_operator(op) {
    const values = []; 
    const self = {
        condition: (value) => {
            if (!Array.isArray(value)) {
                value = [value];
            }
            value = value.filter(e => e !== undefined); //.map(JSON.stringify);
            values.push(...value);
            return self;
        },
        attribute: (value) => {
            if (!Array.isArray(value)) {
                value = [value];
            }
            value = value.filter(e => e !== undefined);
            values.push(...value);
            return self;
        },
        stringify: () => {
            if (values.length) {
                return  `${op}: [ ${ values.join(", ") } ]`;
            }
            return "";
        }
    };

    return self;
}

function filter_field(name) {
    const ops = []; 
    
    function operate(opname) {
        const op = filter_operator(opname);
        ops.pop();
        ops.push(op);
        return op;
    }

    const handler = {
        stringify: () => {
            if (ops.length) {
                return  `${name}: { ${ ops[0].stringify() } }`;
            }
            return "";
        }
    };

    [ "in", "anyofterms", "anyoftext", "allofterms", "alloftext"]
        .forEach((func) => {
            handler[func] = () => operate(func)
        });

    return handler;
}

export function gql_filter(filtertype) {
    const filters = [];
    
    function combiner(cname) {
        const combop = gql_filter(cname); 
        filters.push(combop); 
        return combop; 
    };

    const self = {
        has: (field) => { 
            filters.push(filter_operator("has").condition(field)); 
        },
        attribute: ( field ) => { 
            const fieldOp = filter_field(field);
            filters.push(fieldOp); 
            return fieldOp; 
        },
        or: () => combiner("or"),
        and: () => combiner("and"),
        not: () => combiner("not"),
        stringify: () => {
            const operations = filters.filter((f) => f !== undefined)
                .map(f => `{ ${f.stringify()} } `);

            let result = ""

            if (operations.length) {
                if (filtertype && operations.length > 1) {
                    result = `${filtertype}: [ ${ operations.join(", ") } ]`;
                }
                else if (filtertype) {
                    result = `${ operations.join(" ") }`;
                }
                else {
                    result = `( filter: ${ operations.join(" ") } )`;
                }
            }

            return result;
        }
    };

    return self;
}
