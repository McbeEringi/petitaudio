class PetitAudio{
	constructor(){
		this.ctx=new(window.AudioContext||window.webkitAudioContext)();
		this.pl_={};this.fi_={};this.abs_={};
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
			g1.gain.setValueAtTime(0,0).linearRampToValueAtTime(1,fi).setValueAtTime(1,d*.9).linearRampToValueAtTime(0,d);
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
			if(!this.abs_[plname])this.abs_[plname]={};
			if(fx)fx(x);
		})
		.catch(console.warn);
		return this;
	}
	filter(finame,arg){
		arg={...(this.fi_[finame]?this.fi_[finame].arg:{wet:1,dur:.001}),...arg};
		let tmp=this.fi_[finame],init=!tmp||tmp.arg.type!=arg.type;
		const margeset=()=>{Object.assign(tmp.arg,arg);this.fi_[finame]=tmp;},
			apli=(ap,trg)=>{ap.cancelScheduledValues(0).setValueAtTime(ap.value,0).linearRampToValueAtTime(trg,this.ctx.currentTime+arg.dur);},
			wetinit=(a,x)=>{
				x={arg:a,node:[x,this.ctx.createGain(),this.ctx.createGain()],in:[0,1],out:[1,2]};
				x.node[0].connect(x.node[2]);
				return x;
			},
			margesetwet=()=>{
				margeset();
				apli(tmp.node[1].gain,1-arg.wet);
				apli(tmp.node[2].gain,arg.wet);
			};
		[
			()=>{//gain arg:{type:'gain',gain:Num,dur:Sec}
				if(init)tmp={arg,node:[this.ctx.createGain()],in:[0],out:[0]};
				margeset();
				apli(tmp.node[0].gain,arg.gain);
			},
			async()=>{//reverb arg:{type:'reverb',fadeIn:Sec,decay:Sec,freq:Hz,wet:NRng}
				if(init)tmp=wetinit(arg,this.ctx.createConvolver());
				margesetwet();
				tmp.node[0].buffer=await this._irgen(arg.fadeIn,arg.decay,arg.freq);
			},
			()=>{//biquad arg:{type,freq:Hz,q:Num,gain:dB,wet:NRng}
				if(init)tmp=wetinit(arg,this.ctx.createBiquadFilter());
				margesetwet();
				tmp.node[0].type=arg.type;
				apli(tmp.node[0].frequency,arg.freq);
				apli(tmp.node[0].Q,arg.q);
				apli(tmp.node[0].gain,arg.gain);
			},
			()=>{//delay arg:{type:'delay',delay:Sec,maxDelay:Sec,wet:NRng}
				if(init||tmp.arg.maxDelay!=arg.maxDelay)tmp=wetinit(arg,this.ctx.createDelay(arg.maxDelay));
				margesetwet();
				apli(tmp.node[0].delayTime,arg.delay);
			},
			()=>{//pingpong arg:{type:'pingpong',delay:Sec,maxDelay:Sec,repeat:Num,wet:NRng,channel:Num}
				arg.repeat=arg.repeat||0;arg.channel=arg.channel||2;
				if(init||tmp.arg.channel!=arg.channel||tmp.arg.maxDelay!=arg.maxDelay){
					tmp={arg,node:[this.ctx.createGain(),this.ctx.createGain(),this.ctx.createChannelSplitter(arg.channel),this.ctx.createChannelMerger(arg.channel),this.ctx.createDelay(arg.maxDelay),this.ctx.createGain()],in:[0,1],out:[0,5]};
					tmp.node[1].connect(tmp.node[2]);
					for(let i=0;i<arg.channel;i++)tmp.node[2].connect(tmp.node[3],i,(i+1)%arg.channel);
					tmp.node[3].connect(tmp.node[4]).connect(tmp.node[5]);tmp.node[4].connect(tmp.node[1]);
				}
				margeset();
				apli(tmp.node[1].gain,arg.repeat);
				apli(tmp.node[4].delayTime,arg.delay);
				apli(tmp.node[5].gain,arg.wet);
			},
			()=>{//pan2d arg:{type:'pan2d',pan:-1~1,wet:NRng}
				arg.pan=arg.pan||0;
				if(init)tmp=wetinit(arg,this.ctx.createStereoPanner());
				margesetwet();
				apli(tmp.node[0].pan,arg.pan);
			},
			()=>{//pan3d arg:{type:'pan3d',pos:[x,y,z],to:[dx,dy,dz],dir:NormalRange,wet:NRng}
				arg.dir=Math.max(0,Math.min(1,arg.dir||0));
				if(init)tmp=wetinit(arg,this.ctx.createPanner());
				margesetwet();
				tmp.node[0].cornInnerAngle=(1-arg.dir)*360;
				tmp.node[0].cornOuterAngle=(2-arg.dir)*180;
				tmp.node[0].cornOuterGain=arg.dir;
				['X','Y','Z'].forEach((x,i)=>{
					if(!isNaN(+arg.pos[i]))apli(tmp.node[0][`position${x}`],arg.pos[i]);
					if(!isNaN(+arg.to[i]))apli(tmp.node[0][`orientation${x}`],arg.to[i]);
				});
			}
		][{
			gain:0,reverb:1,
			lowpass:2,highpass:2,bandpass:2,lowshelf:2,highshelf:2,peaking:2,notch:2,allpass:2,
			delay:3,pingpong:4,pan2d:5,pan3d:6
		}[arg.type]]();
		return this;
	}
	start(plname,arr,...t){//[note...]
		for(let x of arr){
			if(isNaN(+x))x=this._n2nn(x);
			const abs=this.ctx.createBufferSource(),
				s=this.pl_[plname].notes.reduce((a,y)=>{const d=Math.abs(y.nn-x);return a[0]<d?a:[d,y];},[Infinity])[1],
				g=this.ctx.createGain(),f=this.pl_[plname].fade;
			abs.buffer=s.buf;abs.loop=this.pl_[plname].loop;
			abs.playbackRate.value=Math.pow(2,(x-s.nn)/12);
			if(f>0)g.gain.setValueAtTime(0,this.ctx.currentTime).linearRampToValueAtTime(1,this.ctx.currentTime+f);
			[{node:[abs],out:[0]},{node:[g],in:[0],out:[0]},...this.pl_[plname].filters.map(y=>this.fi_[y]),{node:[this.ctx.destination],in:[0]}].reduce((a,y)=>{
				a.out.forEach(i=>y.in.forEach(j=>a.node[i].connect(y.node[j])));return y;
			});
			abs.start(...t);
			if(!this.abs_[plname][x])this.abs_[plname][x]=new Set();
			const y=[abs,g];
			this.abs_[plname][x].add(y);
			abs.onended=()=>{if(this.abs_[plname][x])this.abs_[plname][x].delete(y);};
		}
		return this;
	}
	stop(plname,arr=Object.keys(this.abs_[plname]),t=this.ctx.currentTime){//[note...]
		const f=this.pl_[plname].fade;
		for(let x of arr){
			if(isNaN(+x))x=this._n2nn(x);
			if(!this.abs_[plname][x])continue;
			this.abs_[plname][x].forEach(y=>{
				//y[1].gain.cancelScheduledValues(0);
				if(f>0)y[1].gain.setValueAtTime(y[1].gain.value,t).linearRampToValueAtTime(0,t+f);
				y[0].stop(t+this.pl_[plname].fade);
			});
			delete this.abs_[plname][x];
		}
		return this;
	}
}
