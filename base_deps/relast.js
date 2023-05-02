/* jshint esversion:9 */

const html_tags = ['a','abbr','acronym','address','applet','area','article','aside','audio','b','basefont','bb','bdo','big','blockquote','body','br','button','canvas','caption','center','cite','code','col','colgroup','command','datagrid','datalist','dd','details','dfn','dialog','dir','div','dl','dt','em','embed','eventsource','fieldset','figcaption','figure','font','footer','form','frame','frameset','h1','h2','h3','h4','h5','h6head','header','hgroup','hr','html','i','iframe','img','inputins','isindex','kbd','keygen','label','legend','li','link','map','mark','menu','meta','meter','nav','noframes','noscript','object','ol','optgroup','option','output','p','param','pre','progress','q','rp','rt','ruby','s','samp','script','section','select','small','source','span','strike','strong','style','sub','sup','table','tbody','td','textarea','tfoot','th','thead','time','title','tr','track','tt','u','ul','var','video','wbr'];

const API = {
	_gateways: {},
	add_gateway: function(k, url){
		this._gateways[k] = url;
	},
	post: function(api, data){
		return new Promise((resolve, reject) =>{
			const api_split = api.split('/');
			const gateway = this._gateways[api_split[0]];
			api = '';
			api_slash = '',
			api_split.forEach(v => {
				api += `${api_slash}${v}`;
				api_slash = '/';
			});
			data.body = data.body || {};
			data.body.api = api;
			const xhr = new XMLHttpRequest();
			xhr.open('POST', `${gateway}`);
			Object.keys(data.headers || {}).forEach(key =>{
				xhr.setRequestHeader(key, data.headers[key]);
			});
			xhr.onreadystatechange = () =>{
				if(xhr.responseText.trim() === '') return;
				if(xhr.status === 200){
					resolve(JSON.parse(xhr.responseText));
					return;
				}
				reject({status: xhr.status, error: true});
			};
			xhr.send(JSON.stringify(data.body));
		});
	}
};

const Class = function(c)
{
	let final = new Object();
	let black_list = ['extends'];
	if(typeof c.extends === 'function')
	{
		let parent = c.extends();
		for(let p in parent)
		{
			if(black_list.includes(p)) continue;
			final[p === 'init' ? 'super' : p === 'run' ? 'super_run' : p] = parent[p];
		}
	}
	for(let p in c)
	{
		if(black_list.includes(p)) continue;
		final[p] = c[p];
	}
	if(final.actions)
		final.actions.me = final;
	if(final.reactions)
		final.reactions.me = final;

	return function(args){
		if(typeof final.init === 'function'){
			final.init(args); 
		}
		
		if(final.views){
			if(typeof final.comps === 'object'){
				for(let c in final.comps)
					final.add_comp(c, final.comps[c]);
			}
			for(let tag of html_tags){
				final.views[tag] = (props, ...args) =>{
					let propsstr = '';
					for(let p in props)
						propsstr += ` ${p}='${props[p]}'`;
					let childsstr = '';
					let childssep = '';
					for(let c of args){
						childsstr += `${childssep}${c}`;
						childssep = '\n';
					}
					let tags = {i1: '<', i2: '</', e: '>'};
					return `${tags.i1}${tag}${propsstr}${tags.e}${childsstr}${tags.i2}${tag}${tags.e}`;
				};
			}
			final.views.notag = (...args) =>{
				let childsstr = '';
				let childssep = '';
				for(let c of args){
					childsstr += `${childssep}${c}`;
					//childssep = '\s';
				}
				return childsstr;
			};
			final.views.group = final.views.notag;
			final.views.me = final;
			if(final.views.main && typeof final.views.main === 'function')	
				final.render({bbox: final._bbox, view: 'main'});
		}
		final.actions = final.actions || {me: final};
		final.reactions = final.reactions || {me: final};
		final.title = (txt) =>{
			let tag = document.querySelector('head title');
			if(!tag){
				tag = document.createElement('title');
				document.head.appendChild(tag);
			}
			tag.innerHTML = txt || 'App';
		};
		return final;
	};
};

const Relast = Class({
	_is_relast: true,
	_bbox: null,
	_ids: {},
	_states: {},
	_comps: [],
	init: function(data)
	{
		if(typeof data !== 'undefined')
			if(typeof data.root !== 'undefined')
				this._bbox = this.set_bbox(data.root);
		if(typeof this.run === 'undefined')
			this.run = (data) => {this.super_run(data);}
	},
	add_comp: function(k, comp){
		this.views[k] = (props) =>{
			const Comp = new comp(props);
			this._comps.push(Comp);
			Comp.run();
			return Comp.views.main();
		};
	},
	set_bbox: function(root)
	{
		return typeof root === 'string' ? document.getElementById(root) : root;
	},
	super_run: function() {},
	render: function({bbox, view, args})
	{
		bbox = bbox || this._bbox;
		if(!bbox) return;
		if(!this.views || typeof this.views === 'undefined') return;
		bbox = typeof bbox === 'string' ? document.getElementById(bbox) : bbox;
		bbox.innerHTML = this.views[view](args);
		//this.scan(bbox);
	},
	scan: function(node)
	{
		if(typeof node === 'undefined') return;
		//SCAN NODE BY NODE FROM BBOX (ROOT) AND DETECT WHEN IS CALLED ANY SUBCOMPONENT IN THE VIEW (HTML)
		const childs = node.querySelectorAll('*');
		this.set_states(node);
	},
	use_state: function(k, v){
		const setter = `${k[0].toUpperCase()}${k.substring(1, k.length)}`;
		this._states[k] = v;
		this[`set${setter}`] = (value) =>{
			this._states[k] = value;
			this[`${k}`] = v;
			this.render({bbox: this._bbox, view: 'main'});
		};
		this[`${k}`] = v;
	},
	api: function(api, data, reactions, bad_reactions){
		API.post(api, data).then(resp =>{
			this.call_reactions(reactions, resp);
		}).catch(resp =>{
			this.call_reactions(bad_reactions, resp);
		});
	},
	action: function(k, f){
		if(typeof f === 'function'){
			this.actions[k] = f;
			return;
		}
		if(typeof this.actions[k] === 'function')
			return this.actions[k](f);
	},
	call_actions: function(buffer, args){
		if(Array.isArray(buffer)){
			for(let a of buffer)
				if(typeof this.actions[a] === 'function')
					this.actions[a](args);
		}else{
			if(typeof this.actions[buffer] === 'function')
				this.actions[buffer](args);
		}
	},
	reaction: function(k, f){
		if(typeof f === 'function'){
			this.reactions[k] = f;
			return;
		}
		if(typeof this.reactions[k] === 'function')
			return this.reactions[k](f);
	},
	call_reactions: function(buffer, args){
		if(Array.isArray(buffer)){
			for(let r of buffer)
				if(typeof this.reactions[r] === 'function')
					this.reactions[r](args);
		}else{
			if(typeof this.reactions[buffer] === 'function'){
				this.reactions[buffer](args);
			}
		}
	}
});
const CONSTS = {
	DEBUG: true,
	MODS: {}
};
