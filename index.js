/*jshint esversion: 9*/

const fs = require('fs');
const UglifyJS = require("uglify-js");

console.log('Starting compilling process...');
if(process.argv.length < 3)
{
	console.log('I need the path!');
	return;
}
let path = process.argv[2];
if(path[path.length - 1] === '/')
	path = path.substring(0, path.length - 1);
if(fs.existsSync(`${path}/build`))
	fs.rmSync(`${path}/build`, {recursive: true, force: true});

async function read_pack(){
	const file = await fs.readFileSync(`${path}/kpack.json`, {encoding: 'utf8'});
	try{
		return JSON.parse(file);
	}catch(err){
		return {};
	}
}

async function read_jsfiles(data){
	if(!Array.isArray(data)) return [];
	let buffer = '';
	for(let f of data){
		try{
			const datafile = await fs.readFileSync(`${path}/${f}`, {encoding: 'utf8'});
			const file_split = f.split('.');
			if(file_split.length > 0){
				const type = file_split[file_split.length - 1];
				const ismin = file_split[file_split.length - 2] === 'min';
				if(!ismin){
					if(type === 'js' || type === 'css'){ 
						const min = UglifyJS.minify(datafile);
						buffer += min.code;
					}
				}else{
					buffer += datafile;
				}
			}
		}catch(err){
			console.log(`Error reading file: ${f}`);
		}
	}
	return buffer;
}

async function read_html(data){
	try{
		const datafile = await fs.readFileSync(`${path}/${data}`, {encoding: 'utf8'})
		return datafile.replace('main.js', 'main.min.js');
	}catch(err){
		console.log(`Error reading file: ${data}`);
		return '';
	}
}

async function creating_entry_point(data){
	let props = '';
	let comma = '';
	for(let p in data.props){
		props += `${comma}${p}:${data.props[p]}`;
		comma = ',';
	}
	return UglifyJS.minify(`
const app = new ${data.class}({${props}});
	`).code;
}

function create_compile_file(path, data){
	try{
		if(!fs.existsSync(`${path}/build`))
			fs.mkdirSync(`${path}/build`);
		fs.writeFileSync(`${path}/build/main.min.js`, data.js);
		fs.writeFileSync(`${path}/build/index.html`, data.html);
		return true;
	}catch(err){
		console.log(err);
	};
	return false;
}

const pack = read_pack();
pack.then(async data => {
	console.log('Reading JavaScript files...');
	const jsfiles = await read_jsfiles(data.js);
	console.log('Generating App...');
	const entry = await creating_entry_point(data.main);
	console.log('Reading and modifying html file...');
	const html = await read_html(data.html);
	console.log('Creating production files...');
	const result = create_compile_file(path, {html, js: `${jsfiles}${entry}`});
	console.log(`Compilation result: ${result ? 'Success': 'Fail'}`);
});

