const Pack = require("./packer");
const projCreator = require("./proj-creator");
const run = require("./run");

const entry = process.argv[0].trim().toLowerCase() === 'relast' ? 'relast' : 'npm start';

const indexes = {
	action: process.argv[0].trim().toLowerCase() === 'relast' ? 1 : 2,
	arg: process.argv[0].trim().toLowerCase() === 'relast' ? 2 : 3
};

const actions = {
	pack: args => Pack(args),
	create: args => projCreator(args),
	clean: _ => {},
	'create-comp': _ => {},
	'add-dep': _ => {},
	run: args => run(args)
}

const args = {
	pack: '[<dir-path>]',
	create: '<project-name> [<dir-path>]',
	clean: '[<dir-path>]',
	'create-comp': '<comp-name> [<dir-name>]',
	'add-dep': '<dep-url> [<dir-name>]',
	run: '[<dir-name>]'
}

let available_actions = '';
let av_actions_sep = '';
for(let a in actions){
	available_actions += `${av_actions_sep}\t* ${a} ${args[a]}`;
	av_actions_sep = '\n';
}

if(process.argv.length <= indexes.action){
	console.log(`I need an action:\n${available_actions}`);
	return;
}
const proc = process.argv[indexes.action];

if(process.argv.length <= indexes.arg && !proc.match(/pack?|clean?|run?/g)){
	console.log(`I need arguments after the action:\n${available_actions}`);
	return;
}
const arguments = [];
for(let i = indexes.arg; i < process.argv.length; i++){
	arguments.push(process.argv[i]);
}

for(let a in actions){
	const action = actions[a];
	if(a === proc.trim().toLowerCase()){
		if(typeof action === 'function') {
			action(arguments);
			return;
		}
	}
}
console.log(`Follow the following sequence of instructions '${entry} [${available_actions}]'`);
return;
