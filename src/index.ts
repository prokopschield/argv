export class Flags {
	execNode: string;
	execScript: string;
	aliases: Record<string, string> = {};
	named: Record<string, string> = {};
	namedLists: Record<string, string[]> = {};
	ordered: string[] = [];
	constructor(argv: string[]) {
		argv = [...argv]; // avoid rewriting original array
		this.execNode = argv.shift() || process.argv[0];
		this.execScript = argv.shift() || process.argv[1];

		let lastName: string = '';
		let equalsIndex = 0;

		while (argv.length) {
			const arg = argv.shift();
			if (!arg) {
				continue;
			}
			if (arg.startsWith('--')) {
				if ((equalsIndex = arg.indexOf('=', 3)) != -1) {
					this.named[arg.slice(2, equalsIndex)] = arg.slice(
						equalsIndex + 1
					);
					lastName = '';
				} else {
					const param = arg.slice(2);
					this.named[param] ||= param;
					lastName = param;
				}
			} else if (arg.startsWith('-')) {
				if (arg[1]?.match(/[A-Z]/)) {
					const name = arg[1];
					const val = arg.slice(2);
					if (!this.namedLists[name]) {
						this.namedLists[name] = [];
					}
					if (val) {
						this.namedLists[name].push(val);
					}
					lastName = '';
				} else if (arg.length > 1) {
					argv.unshift(`-${arg.slice(2)}`);
					argv.unshift(`--${arg[1]}`);
				}
			} else if (lastName) {
				argv.unshift(`--${lastName}=${arg}`);
				lastName = '';
			} else {
				this.ordered.push(arg);
			}
		}
	}
	alias(key: string, ...aliases: string[]) {
		if (this.aliases[key]) {
			key = this.aliases[key];
		}
		for (const alias of aliases) {
			if (key !== alias) {
				if (this.named[alias]) {
					this.named[key] = this.named[alias];
					delete this.named[alias];
				}
				if (this.namedLists[alias]) {
					if (!this.namedLists[key]) {
						this.namedLists[key] = this.namedLists[alias];
					} else {
						this.namedLists[key].push(...this.namedLists[alias]);
					}
					delete this.namedLists[alias];
				}
				this.aliases[alias] = key;
			}
		}
		return this;
	}
	get(key: string): string | undefined {
		if (this.named[key]) {
			return this.named[key];
		} else if (this.namedLists[key]) {
			return this.namedLists[key][0];
		} else if (this.aliases[key]) {
			return this.get(this.aliases[key]);
		}
	}
	expect<K extends string>(keys: K[], obj: { [key in K]?: string } = {}) {
		let index = 0;
		for (const arg of keys) {
			obj[arg] = this.get(arg) || this.ordered[index++] || obj[arg];
		}
		return obj;
	}
	/** Same as .expect(), except it mutates this argv object. */
	expectMutate<K extends string>(
		keys: K[],
		obj: { [key in K]?: string } = {}
	) {
		for (const arg of keys) {
			const proper = this.get(arg);

			if (proper) {
				obj[arg] = proper;
			}

			const value = this.ordered.shift() || obj[arg];

			if (value) {
				if (this.aliases[arg]) {
					obj[arg] = this.named[this.aliases[arg]] = value;
				} else {
					obj[arg] = this.named[arg] = value;
				}
			}
		}
		return obj;
	}
}

export default new Flags(process.argv);
