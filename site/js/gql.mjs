/**
 * Transforms a JSON Object into a GraphQL query statement. 
 * 
 * @param {Object} json 
 * @returns 
 */
 export function json_to_gql(json) {
    if (json && Object.keys(json).length) {
        const querystring = Object.entries(json)
            .filter(([name]) => (name.at(0) != "@")) // at top level no at is allowed
            .map(([name, value]) => {
                let alias;
                if (value && value["@alias"]) {
                    alias = name; 
                    name = value["@alias"];
                }
                const q = gql_query(name);
                if (alias) {
                    q.alias(alias);
                }
                
                json_handle_selector(q, value);
                return q;
            })
            .map(entity => entity.stringify())
            .join(" ");
            
        return `{ ${querystring} }`;
    }

    return "";
} 

/**
 * GraphQL PrettyPrinter
 * 
 * This handy function prettyprints GraphQL Queries. This is useful for debugging.
 * 
 * @param {String} gqlstring 
 * @param {String} indent (default: "  ")
 * @returns 
 */
export function pretty_gql(gqlstring, indent) {
    if (!indent) {
        indent = "  ";
    }

    const tokenopen = ["{", "[", "("],
          tokenclse = ["}", "]", ")"],
          nobreak = tokenopen;

    return gqlstring.split( " " ).filter(t=> t.length).reduce(({result, level, pushnext}, token) => {
        const breaktoken =  (tokenopen.includes(token.at(-1))) - (tokenclse.includes(token.at(0)));
        
        if (breaktoken) {
            level += breaktoken;
            if (level < 0) {
                level = 0;
            }
        }

        let breakprev = "\n";
        let nextindent = indent.repeat(level) + pushnext;
        pushnext = "";

        if (nobreak.includes(token.at(-1))) {
            nextindent = " ";
            breakprev = "";
        }

        if (breaktoken > 0 && level === 1) {
            nextindent = "";
        }

        if (token.at(-1) === ":") {
            pushnext = indent;
        }

        result = `${result}${breakprev}${nextindent}${token}`;

        return {result, level, pushnext};
    }, {
        level : 0,
        pushnext : "",
        result : ""
    }).result;
}

/**
 * Helper Function for building GraphQL Filters
 * 
 * This function is rarely used directly but accessed via gql_query().
 * 
 * @param {String} filtertype 
 * @returns 
 */
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
            const operations = filters.filter((f) => f != null)
                .map(f => `{ ${f.stringify()} } `)
                .filter(f => f.length);

            if (operations.length) {
                if (filtertype && operations.length > 1) {
                    return `${filtertype}: [ ${ operations.join(", ") } ]`;
                }
                return `${ operations.join(", ") }`;
            }

            return "";
        }
    };

    return self;
}

/**
 * Main Query Builder Interface 
 * 
 * This is a helper function for json_to_gql(). It allows to create GraphQL queries programmatically. 
 * 
 * @param {String}} target 
 * @returns 
 */
export function gql_query(target) {
    const selector = [];
    
    const order = orderList();
    const filter = filterList();
    const pagination = [];

    const caching = {
        stringify: () => {
            if (caching.maxage > 0) {
                return `@cacheControl(maxAge: ${caching.maxage})`
            }
            return "";
        }
    };

    let cascade;
    const alias = {
        stringify: () => {
            if (alias.label && alias.label.length > 0) {
                return alias.label;
            }
            return "";
        }
    };

    const targetObj = {
        stringify: () => target
    };

    const self = {
        alias: (newalias) => { 
            alias.label = newalias;
            return self;
        },
        cascade: () => { 
            cascade = cascadeFields(); 
            return cascade;
        },
        caching: (seconds) => {
            caching.maxage = seconds;
            return self;
        },

        offset: (itemid) => {
            pagination.push({ stringify: () => `offset: ${itemid}` });
            return self;
        },

        limit: (nitems) => {
            pagination.push({ stringify: () => `first: ${nitems}` });
            return self;
        },

        filter: () => filter.add(),
        order: () => order.add(), 

        field: (sel, bCascade) => {
            if (bCascade) {
                if (!cascade) {
                    self.cascade();
                }
                cascade.field(sel);
            }

            if (Array.isArray(sel)) {
                sel = sel.map(selectionLiteral);
                selector.push(...sel);
                return self;
            }

            const q = gql_query(sel);
            selector.push(q);
           
            return q;
        },
        stringify: () => { 
            const label = [alias, targetObj]
                .filter(t => t != null).map(t => t.stringify()).filter(t => t.length).join(": ");
            const parameters= [filter, order, ...pagination]
                .filter(t => t != null).map(t => t.stringify()).filter(t => t.length).join(", ");
            const directives = [cascade, caching]
                .filter(t => t != null).map(t => t.stringify()).filter(t => t.length).join(" ");;

            const preamble = [
                label, 
                parameters.length ? `( ${parameters} )`: parameters,
                directives
            ].filter(t => t.length).join(" ");

            const sel = selector.map((t) => t.stringify()).join(" ");

            if (sel.length) {
                return `${preamble} { ${sel} }`;
            }
            return preamble;
        }
    };
    return self;
}

// *** HELPER FUNCTIONS ***

function cascadeFields() {
    const cascade = [];
    return {
        field: (field) => { 
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

function orderLiteral() {
    let orderItem = "";
    return {
        asc: (field) => orderItem = `asc: ${field}`,
        desc: (field) => orderItem = `desc: ${field}`,
        stringify: () => orderItem
    };
}

function orderList() {
    const orders = [];
    return {
        add: () => {
            const ol = orderLiteral(); 
            orders.push(ol)
            return ol;
        },
        stringify: () => {
            if (orders.length > 1) {
                orders.push("");
                return "order: " + orders.reverse()
                    .reduce((acc, order) => acc.length ? `{ ${order.stringify()}, then: ${acc} }` : `{ ${order.stringify()} }`);
            }
            if (orders.length) {
                return `order: { ${orders[0].stringify()} }`
            }
            return "";
        } 
    };
}

function selectionLiteral(lit) {
    return {
        stringify: () => lit
    };
}

function filterList() {
    const filter = gql_filter();
    return {
        add: () => {
            return filter;
        },
        stringify: () => {
            const strFilter = filter.stringify();
            if (strFilter.length) {
                return `filter: ${strFilter}`;
            }
            return "";
        }
    }
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
        op: operate,

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

const jsonhandlers = {
    options: (p, val) => {
        Object.entries(val)
            .filter(([option]) => Object.hasOwn(jsonhandlers, option))
            .forEach( ([option, value]) => jsonhandlers[option](p, value) );
    },

    filter: (p, val) => handleFilterCondition(p.filter(), val),

    order: (p, val) => {
        if (!Array.isArray(val)) {
            val = [val];
        }
        val.filter(ord => ord != null && typeof(ord) === "object")
            .map((ord) => {
                return Object.entries(ord).shift();
            })
            .filter(([dir]) => ["asc", "desc"].includes(dir))
            .forEach( ([dir, value]) => p.order()[dir](value) );
    },

    offset: (p, val) => p.offset(val),

    limit: (p, val) => p.limit(val),

    directives: (p,val) => {
        Object
            .entries(val)
            .filter(([dir]) => Object.hasOwn(jsonhandlers, dir))
            .forEach(([dir, value]) => {
                jsonhandlers[dir](p, value);
        });
    },

    caching: (p, val) => p.caching(val),

    cascade: (p, val) => {
        const cas = p.cascade();
        if (val && val.length) {
            if (!Array.isArray(val)) {
                val = [ val ];
            }
           cas.field(val);
        }
    }
};

function handleFilterCondition(p, val) {
    Object.entries(val).forEach(([key, value]) => {
        if(["and", "or", "not"].includes(key)) {
            const handler = p[key]();
            if (!Array.isArray(value)) {
                value = [value];
            }
            value.forEach((value) => handleFilterCondition(handler, value));
        }
        else if (key === "has") {
            p.has(value);  // stupid special case.
        }
        else if ([ "in", "alloftext", "anyoftext", "allofterms", "anyofterms"].includes(key)) {
            if (!Array.isArray(value)) {
                value = [value];
            }

            p[key]().condition(value);
        }
        else {
            handleFilterCondition(p.attribute(key), value);
        }
    });
}

function json_handle_selector(parent, json) {
    const singletons = Object.entries(json)
        .filter(([name, value]) => (name.at(0) != "@" && (value == null || !Object.keys(value).length)))
        .map(([n]) => n);
    const complexitons = Object.entries(json)
        .filter(([name, value]) => (name.at(0) != "@" && value != null && Object.keys(value).length));
    const directives = Object.entries(json)
        .filter(([name]) => (name.at(0) === "@"))
        .map(([name, value]) => { 
            name = name.slice(1).toLowerCase(); 
            return [name, value];
        })
        .filter(([dir]) => Object.hasOwn(jsonhandlers, dir));

    parent.field(singletons);
    
    complexitons.forEach(([name, value]) => {
        if (value && value["@alias"]) {
            const handler = parent.field(value["@alias"], value && value["@required"]);
            handler.alias(name);

            json_handle_selector(handler, value);
        }
        else {
            json_handle_selector(parent.field(name, value && value["@required"]), value);
        }
    });

    directives.forEach(([dir, val]) => {
        jsonhandlers[dir](parent, val);
    });
}
