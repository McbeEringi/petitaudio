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
			g0.gain.setTargetAtTime(0,0,d*.2);
			g1.gain.setValueCurveAtTime(new Float32Array([0,1]),0,fi).setValueCurveAtTime(new Float32Array([1,0]),d*.9,d*.1);
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
	filter(finame,arg){
		if(this.fi_[finame])arg={...this.fi_[finame].arg,...arg};
		let tmp=this.fi_[finame],init=!tmp||tmp.arg.type!=arg.type;
		const margeset=()=>{Object.assign(tmp.arg,arg);this.fi_[finame]=tmp;},
			wetinit=(a,x)=>{
				x={arg:a,node:[x,this.ctx.createGain(),this.ctx.createGain()],in:[0,1],out:[1,2]};
				x.node[0].connect(x.node[2]);
				return x;
			},
			margesetwet=()=>{
				margeset();
				tmp.node[1].gain.value=1-(tmp.node[2].gain.value=arg.wet||1);
			};
		[
			()=>{//gain arg:{type:'gain',gain:Num}
				if(init)tmp={arg,node:[this.ctx.createGain()],in:[0],out:[0]};
				margeset();
				tmp.node[0].gain.value=arg.gain;
			},
			async()=>{//reverb arg:{type:'reverb',fadeIn:Sec,decay:Sec,freq:Hz,wet:Num}
				if(init)tmp=wetinit(arg,this.ctx.createConvolver());
				margesetwet();
				tmp.node[0].buffer=await this._irgen(arg.fadeIn,arg.decay,arg.freq);
			},
			()=>{//biquad arg:{type,freq:Hz,q:Num,gain:dB,wet:Num}
				if(init)tmp=wetinit(arg,this.ctx.createBiquadFilter());
				margesetwet();
				tmp.node[0].type=arg.type;tmp.node[0].frequency.value=arg.freq;
				tmp.node[0].Q.value=arg.q;tmp.node[0].gain.value=arg.gain;
			},
			()=>{//delay arg:{delay:Sec,maxDelay:Sec,first:Bool,repeat:Num,wet:Num}
				arg.repeat=arg.repeat||0;
				if(init){
					tmp={arg,node:[this.ctx.createDelay(arg.maxDelay),this.ctx.createGain(),this.ctx.createGain(),this.ctx.createGain()],in:[0,1],out:[1,2]};
					tmp.node[0].connect(tmp.node[2]);tmp.node[0].connect(tmp.node[3]).connect(tmp.node[0]);
				}else if(tmp.arg.maxDelay!=arg.maxDelay)tmp.node[0]=this.ctx.createDelay(arg.maxDelay);
				margesetwet();
				if(arg.first){tmp.node[1].gain.value=1;tmp.node[2].gain.value*=arg.repeat;}
				tmp.node[0].delayTime.value=arg.delay;
				tmp.node[3].gain.value=arg.repeat;
			}
		][{
			gain:0,reverb:1,
			lowpass:2,highpass:2,bandpass:2,lowshelf:2,highshelf:2,peaking:2,notch:2,allpass:2,
			delay:3
		}[arg.type]]();
		return this;
	}
	start(plname,arr,...t){//[note...]
		for(let x of arr){
			if(isNaN(+x))x=this._n2nn(x);
			const abs=this.ctx.createBufferSource(),
				s=this.pl_[plname].notes.reduce((a,y)=>Math.abs(y.nn-x)<=Math.abs(a.nn-x)?y:a);
			abs.buffer=s.buf;
			abs.playbackRate.value=Math.pow(2,(x-s.nn)/12);
			[{node:[abs],out:[0]},...this.pl_[plname].filters.map(y=>this.fi_[y]),{node:[this.ctx.destination],in:[0]}].reduce((a,y)=>{
				a.out.forEach(i=>y.in.forEach(j=>a.node[i].connect(y.node[j])));return y;
			});
			abs.start(...t);
		}
		return this;
	}
}
