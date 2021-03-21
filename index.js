const AT = '@';
const SLASH = '/';
const DO_NOTHING = x => x;

export const normalise = path => path.endsWith(SLASH) ? path.substr(0, path.length - 1) : path;
export const o = (input, output = {...(input || {})}) => output;
export const enumm = (...keys) => extend(keys, object(keys.map(key => [key, Symbol(key)])));
export const entries = obj => Object.entries(obj);
export const extend = (obj, ...others) => Object.assign(obj, ...others);
export const concat = (...objs) => extend({}, ...objs);
export const apply = (obj, values) => entries(values || {}).forEach(([key, val]) => obj[key] = val) || obj;
export const object = map => map.reduce((obj, [key, value]) => {
	obj[key] = value;
	return obj;
}, {});
// export const object = map => Object.fromEntries(map);
export const iterator = (obj, iterator) => object(iterator(entries(obj)) || []);
export const iterate = (obj, iter = DO_NOTHING) => iterator(obj, entries => entries.forEach(iter));
export const map = (obj, mapper = DO_NOTHING) => iterator(obj, entries => entries.map(mapper));
export const filter = (obj, filter = x => true) => iterator(obj, entries => entries.filter(filter));
export const sort = (obj, sorter = DO_NOTHING, _default = []) =>
	[...entries(obj).reduce(
		(list, pair) => {
			const [target, value] = sorter(...pair);
			if (target > -1)
				(list[target] = list[target] || []).push([pair[0], value]);
			return list;
		}, _default
	)].map(entries => object(entries || []));
export const view = (obj, ...ignorelist) => {
	ignorelist.unshift('constructor');
	return object(
		Object.getOwnPropertyNames(obj)
			.filter(name => !ignorelist.includes(name))
			.map(name => [name, obj[name]])
	);
}
export const has = (obj, key) => Object.getOwnPropertyNames(obj).includes(key);
export const pop = args => [args.pop(), ...args];
export const copy_object = obj => map(obj, ([key, val]) => [key, copy(val)]);
export const copy_array = array => array.map(copy);
export const copy = item => is.literal(item) ? item : item instanceof Array ? cp_array(item) : cp_object(item);

export const is = {
	...object([
		"function",
		"string",
		"number",
		"object",
		"symbol",
		"bigint",
		"undefined",
	].map(key => [key, val => typeof val === key])),
	literal: x => is.object(x) ? x.constructor === Object : !is.function(x),
	constructable: T => !!T.prototype && T.name && !T.name.startsWith(AT),
	global: that => is.undefined(that) || that === globalThis,
	either: (a, b) => is.undefined(a) ? b : a,
	defined: x => !is.undefined(x) && x !== null,
};

export const create = extend(
	(props, proto = null) => Object.create(proto, props),
	{
		property: (
			value = null,
			enumerable = false,
			writable = false,
			configurable = true
		) => {
			return {
				value,
				enumerable,
				writable,
				configurable
			}
		},
		properties: (
			props,
			enumerable = false,
			descriptor = create.value
		) => map(props, ([key, value]) =>
				[key, descriptor(value, enumerable)]),
		value: (value, enumerable = false) => create.property(value, enumerable),
		variable: (value, enumerable = false) => create.property(value, enumerable, true),

		values: (props, enumerable = false) => create.properties(props, enumerable, create.value),
		variables: (props, enumerable = false) => create.properties(props, enumerable, create.variable),
	}
);
export const define = extend(
	(obj, props) => Object.defineProperties(obj, props),
	{
		values: (obj, props, enumerable = false) => define(obj, create.values(props, enumerable)),
		variables: (obj, props, enumerable = false) => define(obj, create.variables(props, enumerable)),
	}
);
// We need to do some overlap... replicate for now...
export const Accessor = (
	get = obj => undefined,
	set = (obj, value) => undefined,
	enumerable = true,
	configurable = true,
	key = Symbol()
) => {
	return {
		get() {
			let val = this[key];
			return is.undefined(val) ? define(this, {
				[key]: create.variable(get(this))
			}) && this[key] : val;
		},
		set(value) {
			let val = this[key];
			return this[key] === value ?
				value : define(this, {
					[key]: create.variable(set(this, value, val))
				});
		},
		enumerable,
		configurable
	};
};
export const Getter = (get = obj => undefined, enumerable = true) => {
	return {
		get() {
			return get(this);
		},
		enumerable
	}
};