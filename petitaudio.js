class PetitAudio{
	constructor(){
		this.ctx=new(window.AudioContext||window.webkitAudioContext)();
		this.pl_={};this.fi_={};
		return this;
	}
	now(){return this.ctx.currentTime;}
	_n2nn(x){return+({c:12,d:14,e:16,f:17,g:19,a:21,b:23})[x[0].toLowerCase()]+(({'#':1,s:1})[x[1]]?x.slice(2)*12+1:x.slice(1)*12);}
	_irgen(pred,d,cut,rate=this.ctx.sampleRate){
		return new Promise(f=>{
			d+=pred;
			const fr=d*rate,
				oac=new(window.OfflineAudioContext||window.webkitOfflineAudioContext)(1,fr,rate),
				ab=oac.createBuffer(1,fr,rate),
				lpf=oac.createBiquadFilter(),
				gain=oac.createGain(),
				bs=oac.createBufferSource(),
				view=ab.getChannelData(0);
			for(let i=0;i<fr;i++)view[i]=Math.random()*2-1;
			lpf.type='lowpass';lpf.frequency.value=cut;lpf.Q.value=0;
			gain.gain.value=0;
			gain.gain.linearRampToValueAtTime(1,pred).exponentialRampToValueAtTime(.01,d*.95).linearRampToValueAtTime(0,d);
			bs.buffer=ab;
			bs.connect(lpf);lpf.connect(gain);gain.connect(oac.destination);
			bs.start();
			oac.startRendering();
			oac.oncomplete=e=>f(e.renderedBuffer);
		});
	}
	player(plname,obj,fx){//obj {notes:{[notename]:(url||File||Blob),...},baseUrl:'',filters:[filtername...],loop:Boolean,fade:Number}
		const ctx=this.ctx;
		Promise.all(Object.entries(obj.notes||{}).map(async x=>{
			if(isNaN(+x[0]))x[0]=this._n2nn(x[0]);
			if(isNaN(+x[0]))return;
			let y;
			if(typeof x[1]=='string')y=await fetch((obj.baseUrl||'')+x[1]);
			else y=new Response(x[1])
			y=await y.arrayBuffer();
			y=await new Promise((f,r)=>ctx.decodeAudioData(y,f,r));
			return{nn:+x[0],buf:y};//,dat:x[1]
		}))
		.then(x=>{
			if(obj.notes)obj.notes=x;
			x={...(this.pl_[plname]||{}),...obj};
			this.pl_[plname]=x;
			if(fx)fx(x);
		})
		.catch(console.warn);
		return this;
	}
	filter(finame,obj){//wip
		({
			reverb:()=>{
				let tmp=this.fi_[finame];
				if(tmp.type!=obj.type)tmp={type:obj.type,node:this.ctx.createConvolver()};

			},
			gain:()=>{
				let tmp=this.fi_[finame];
				if(tmp.type!=obj.type)tmp={type:obj.type,node:this.ctx.createGain()};
				tmp.node.gain.value=obj.gain;
				this.fi_[finame]=tmp;
			}
		})[obj.type]();
		return this;
	}
	start(plname,arr,...t){//[note...]
		for(let x of arr){
			if(isNaN(+x))x=this._n2nn(x);
			const absn=this.ctx.createBufferSource(),
				s=this.pl_[plname].notes.reduce((a,y)=>Math.abs(y.nn-x)<=Math.abs(a.nn-x)?y:a);
			absn.buffer=s.buf;
			absn.playbackRate.value=Math.pow(2,(x-s.nn)/12);
			absn.connect(this.ctx.destination);
			absn.start(...t);
		}
		return this;
	}
}
