const fs = require('fs');

module.exports = (async args =>{
	const projname = args[0];
	let path = args[1] || process.cwd();
	if(path[path.length - 1] === '/')
		path = path.substring(0, path.length - 1);
	const dir_exist = await fs.existsSync(path);
	if(!dir_exist){
		console.log('I need a real directory to create your project');
		return;
	}

	const projname_filtered = projname.replace(/\s/g, '_');
	const projdir = `${path}/${projname_filtered}`;
	if(await fs.existsSync(projdir))
		fs.rmSync(projdir, {recursive: true, force: true});
	const srcdir = `${projdir}/src`;
	const depsdir = `${projdir}/deps`;
	await fs.mkdirSync(srcdir, {recursive: true});
	await fs.mkdirSync(depsdir, {recursive: true});

	async function create_index_html(){
		return `<!DOCTYPE html>
<html>
	<head>
		<title>${projname.toUpperCase()}</title>
	</head>
	<body>
		<div id='root'></div>
		<script src='./main.js'></script>
	</body>
</html>`;
	}
	async function create_kconfig(){
		return `{
	"html": "index.html",
	"js": [
		"./deps/relast.js", 
		"./src/App.js"
	],
	"main": {
		"class": "App",
		"props": {
			"root": "root"
		}
	}
}`;
	}
	async function create_jsMain(){
		return `/*jshint esversion: 9*/
function JSLoader(jsfiles, cback, debug=true){
	if(!Array.isArray(jsfiles)) return;
	let index = 0;
	for(const file of jsfiles){
		const script = document.createElement('script');
		script.src = file+(debug ? '?'+(Math.ceil(Math.random() * Date.now())) : '');
		script.onload = ()=>{
			index++;
			if(index >= jsfiles.length){
				if(typeof cback === 'function') cback();
				return;
			}
		};
		document.body.appendChild(script);
	}
}
JSLoader(['./deps/relast.js'], ()=>{
	JSLoader(['./src/App.js'], () =>{
		const app = new App({
			root: 'root'
		});
	});
});`;
	}
	async function create_mainApp(){
		return `/*jshint esversion: 9*/
const App = new Class({
	extends: Relast,
	init: function(props){
		this.super(props);
		// Here a list of sub-components, example:
		// this.add_comp('[Component-name]', [Component-class]);
		// Here a use states, example:
		// this.use_state('[state-name]', [value]);
	},
	run: function(){
	},
	actions: {},
	reaction: {},
	views: {
		main: function(args){
			return this.group(
				this.h1(null, 'Starting a Relast App')
			);
		},
	}
});`;
	}

	async function file_creator(data){
		return await fs.writeFileSync(`${data.name}`, data.content);
	}

	async function copying_relast(){
		const relast = await fs.readFileSync('./base_deps/relast.js', {encoding: 'utf8'});
		return relast;
	}

	async function start(){
		console.log('Creating the json file configurator...');
		const kpack = await create_kconfig();
		await file_creator({name: `${projdir}/kpack.json`, content: kpack});
		console.log('Creating a index.html...');
		const index_html = await create_index_html();
		await file_creator({name: `${projdir}/index.html`, content: index_html});
		console.log('Creating a debuging entry point file...');
		const mainjs = await create_jsMain();
		await file_creator({name: `${projdir}/main.js`, content: mainjs});
		console.log('Getting relast code...');
		const relastjs = await copying_relast();
		await file_creator({name: `${depsdir}/relast.js`, content: relastjs});
		console.log('Creating main App file...');
		const mainapp = await create_mainApp();
		await file_creator({name: `${srcdir}/App.js`, content: mainapp});
		console.log(`${projname} project created in ${projdir}/ successfully!!`);
	}

	await start();
});
