const spawn = require('child_process');
const packer = require('./packer');
const http = require('http');
const fs = require('fs');

module.exports = (async args =>{
	let path = args[1] || process.cwd();
	const type = args[0];
	let build = false;
	if(path[path.length - 1] === '/')
		path = path.substring(0, path.length - 1);
	if(type.trim().toLowerCase() === 'build' || type.trim().toLowerCase() === 'b'){
		build = true;
		await packer([path]);
	}
	const root = `${path}${build ? `/build` : ''}`;
	const kpack = `${root}/kpack.json`;
	const kpack_exist = await fs.existsSync(kpack);
	if(!kpack_exist){
		console.log(`Project does not exist!!`);
		return;
	}
	const kpack_json = JSON.parse(await fs.readFileSync(kpack, {encoding: 'utf8'}));
	const html_file = `${root}/${!build ? kpack_json.html : 'index.html'}`;
	const html_exist = await fs.existsSync(html_file);
	if(!html_exist){
		console.log('HTML file does not exist!!');
		return;
	}
	const html_data = await fs.readFileSync(html_file, {encoding: 'utf8'});

	http.createServer((req, res) =>{
		res.writeHead(200, {'Content-Type': 'text/html'});
		res.end(html_data);
	}).listen(8080);
	const debug = `http://localhost:8080`;
	spawn.exec(`google-chrome --no-sandbox ${debug}`);
	console.log(`running on ${debug}`);
});
