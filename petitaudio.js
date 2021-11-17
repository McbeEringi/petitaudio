class PetitAudio{
	constructor(){
		this.ctx=new(window.AudioContext||window.webkitAudioContext)();
		this.pl_={};this.abs_={};
		return this;
	}
	now(){return this.ctx.currentTime;}
	_n2nn(x){return isNaN(+x)?({c:12,d:14,e:16,f:17,g:19,a:21,b:23})[x[0].toLowerCase()]+(({'#':1,s:1})[x[1]]?x.slice(2)*12+1:x.slice(1)*12):x;}
	irgen(fi=.1,d=2.5,cut=10000,ch=2,rate=this.ctx.sampleRate){
		return new Promise(f=>{
			const fr=d*rate,
				oac=new(window.OfflineAudioContext||window.webkitOfflineAudioContext)(ch,fr,rate),
				ab=oac.createBuffer(ch,fr,rate),lpf=oac.createBiquadFilter(),g0=oac.createGain(),
				g1=oac.createGain(),bs=oac.createBufferSource();
			for(let i=0,view;i<ch;i++){view=ab.getChannelData(i);for(let j=0;j<fr;j++)view[j]=Math.random()*2-1;}
			lpf.type='lowpass';lpf.frequency.value=cut;lpf.Q.value=0;
			g0.gain.setTargetAtTime(0,0,d*.2);
			g1.gain.setValueAtTime(0,0).linearRampToValueAtTime(1,fi).setValueAtTime(1,d*.9).linearRampToValueAtTime(0,d);
			bs.buffer=ab;[bs,lpf,g0,g1,oac.destination].reduce((a,x)=>a.connect(x));bs.start();
			oac.startRendering();oac.oncomplete=e=>f(e.renderedBuffer);
		});
	}
	player(name,arg,fx){//arg:{notes:{[notename]:(url||File||Blob),...},baseUrl:'',loop:Boolean,fade:Sec,node:[AudioNode]}
		Promise.all(Object.entries(arg.notes||{}).map(async x=>{
			x[0]=this._n2nn(x[0]);
			let y;
			if(typeof x[1]=='string')y=await fetch((arg.baseUrl||'')+x[1]);
			else y=new Response(x[1])
			y=await y.arrayBuffer();
			y=await new Promise((f,r)=>this.ctx.decodeAudioData(y,f,r));
			return{nn:+x[0],buf:y};//,dat:x[1]
		}))
		.then(x=>{
			if(arg.notes)arg.notes=x;
			if(!this.abs_[name])this.abs_[name]={};
			if(!this.pl_[name])this.pl_[name]={loop:false,fade:0,node:[]};
			Object.assign(this.pl_[name],arg);
			if(fx)fx(this.pl_[name]);
		})
		.catch(console.warn);
		return this;
	}
	start(name,arr,t=this.ctx.currentTime,o,d){//[note...]
		for(let x of arr){
			x=this._n2nn(x);
			const abs=this.ctx.createBufferSource(),
				s=this.pl_[name].notes.reduce((a,y)=>{const d=Math.abs(y.nn-x);return a[0]<d?a:[d,y];},[Infinity])[1],
				g=this.ctx.createGain(),f=this.pl_[name].fade;
			abs.buffer=s.buf;abs.loop=this.pl_[name].loop;
			abs.playbackRate.value=Math.pow(2,(x-s.nn)/12);
			if(f>0)g.gain.setValueAtTime(0,t).linearRampToValueAtTime(1,t+f);
			abs.connect(g);
			this.pl_[name].node.forEach(y=>g.connect(y));
			abs.start(t,o,d);
			if(!this.abs_[name][x])this.abs_[name][x]=new Set();
			const y=[abs,g];
			this.abs_[name][x].add(y);
			abs.onended=()=>{if(this.abs_[name][x])this.abs_[name][x].delete(y);};
		}
		return this;
	}
	stop(name,arr=Object.keys(this.abs_[name]),t=this.ctx.currentTime){//[note...]
		const f=this.pl_[name].fade;
		for(let x of arr){
			x=this._n2nn(x);
			if(!this.abs_[name][x])continue;
			this.abs_[name][x].forEach(y=>{
				if(f>0)y[1].gain.cancelScheduledValues(t).setValueAtTime(y[1].gain.value,t).linearRampToValueAtTime(0,t+f);
				y[0].stop(t+f);
			});
			delete this.abs_[name][x];
		}
		return this;
	}
}