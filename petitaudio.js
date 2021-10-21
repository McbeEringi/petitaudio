class PetitAudio{
	constructor(){
		this.ctx=new(window.AudioContext||window.webkitAudioContext)();
		this.pl_={};this.fi_={};
		return this;
	}
	now(){return this.ctx.currentTime;}
	_n2nn(x){return+({c:12,d:14,e:16,f:17,g:19,a:21,b:23})[x[0].toLowerCase()]+(({'#':1,s:1})[x[1]]?x.slice(2)*12+1:x.slice(1)*12);}
	_irgen(fi,d,cut,rate=this.ctx.sampleRate,ch=2){
		return new Promise(f=>{
			const fr=d*rate,
				oac=new(window.OfflineAudioContext||window.webkitOfflineAudioContext)(ch,fr,rate),
				ab=oac.createBuffer(ch,fr,rate),lpf=oac.createBiquadFilter(),g0=oac.createGain(),
				g1=oac.createGain(),bs=oac.createBufferSource();
			for(let i=0,view;i<ch;i++){view=ab.getChannelData(i);for(let j=0;j<fr;j++)view[j]=Math.random()*2-1;}
			lpf.type='lowpass';lpf.frequency.value=cut;lpf.Q.value=0;
			g0.gain.value=1;g0.gain.exponentialRampToValueAtTime(.01,d*.9).linearRampToValueAtTime(0,d);
			g1.gain.value=0;g1.gain.linearRampToValueAtTime(1,fi);
			bs.buffer=ab;[bs,lpf,g0,g1,oac.destination].reduce((a,x)=>a.connect(x));bs.start();
			oac.startRendering();oac.oncomplete=e=>f(e.renderedBuffer);
		});
	}
	player(plname,arg,fx){//arg:{notes:{[notename]:(url||File||Blob),...},baseUrl:'',filters:[filtername...],loop:Boolean,fade:Number}
		const ctx=this.ctx;
		Promise.all(Object.entries(arg.notes||{}).map(async x=>{
			if(isNaN(+x[0]))x[0]=this._n2nn(x[0]);
			if(isNaN(+x[0]))return;
			let y;
			if(typeof x[1]=='string')y=await fetch((arg.baseUrl||'')+x[1]);
			else y=new Response(x[1])
			y=await y.arrayBuffer();
			y=await new Promise((f,r)=>ctx.decodeAudioData(y,f,r));
			return{nn:+x[0],buf:y};//,dat:x[1]
		}))
		.then(x=>{
			if(arg.notes)arg.notes=x;
			x={...(this.pl_[plname]||{filters:[],loop:false,fade:0}),...arg};
			this.pl_[plname]=x;
			if(fx)fx(x);
		})
		.catch(console.warn);
		return this;
	}
	filter(finame,arg){console.log(this.fi_[finame]);
		if(this.fi_[finame]){arg={...this.fi_[finame].arg,...arg};console.log(arg)}
		let tmp=this.fi_[finame],init=!tmp||tmp.arg.type!=arg.type;
		({
			reverb:async()=>{//arg:{type:'reverb',fadeIn:Sec,decay:Sec,cutFreq:Hz,wet:NormalRange}
				if(init){
					tmp={arg,node:[this.ctx.createConvolver(),this.ctx.createGain(),this.ctx.createGain()],in:[0,1],out:[1,2]};
					tmp.node[0].connect(tmp.node[2]);
				}
				Object.assign(tmp.arg,arg);this.fi_[finame]=tmp;
				tmp.node[0].buffer=await this._irgen(tmp.arg.fadeIn,tmp.arg.decay,tmp.arg.cutFreq);
				tmp.node[1].gain.value=1-tmp.arg.wet;
				tmp.node[2].gain.value=tmp.arg.wet;
			},
			gain:()=>{//arg:{type:'gain',gain:NormalRange}
				if(init)tmp={arg,node:[this.ctx.createGain()],in:[0],out:[0]};
				Object.assign(tmp.arg,arg);this.fi_[finame]=tmp;
				tmp.node[0].gain.value=tmp.arg.gain;
			},
			biquad:()=>{},
			pan:()=>{},
		})[arg.type]();
		return this;
	}
	start(plname,arr,...t){//[note...]
		for(let x of arr){
			if(isNaN(+x))x=this._n2nn(x);
			const absn=this.ctx.createBufferSource(),
				s=this.pl_[plname].notes.reduce((a,y)=>Math.abs(y.nn-x)<=Math.abs(a.nn-x)?y:a);
			absn.buffer=s.buf;
			absn.playbackRate.value=Math.pow(2,(x-s.nn)/12);
			[{node:[absn],out:[0]},...this.pl_[plname].filters.map(y=>this.fi_[y]),{node:[this.ctx.destination],in:[0]}].reduce((a,y)=>{
				a.out.forEach(i=>y.in.forEach(j=>a.node[i].connect(y.node[j])));return y;
			});
			absn.start(...t);
		}
		return this;
	}
}
