class PetitAudio{
	constructor(){
		this.ctx=new(AudioContext||webkitAudioContext)();
		this.ab={};
		return this;
	}
	now(){return this.ctx.currentTime;}
	load(name,notes,fx){//{note:url,...}
		const ctx=this.ctx;
		Promise.all(Object.entries(notes).map(async x=>{
			if(isNaN(+x[0]))return x;
			let y=await fetch((notes.base||'')+x[1]);
			y=await y.arrayBuffer();
			y=await new Promise((f,r)=>ctx.decodeAudioData(y,f,r));
			return[+x[0],y];
		}))
		.then(x=>{
			x=[...new Map([...(this.ab[name]||[]),...x]).entries()];
			this.ab[name]=x;
			if(fx)fx(x);
		})
		.catch(console.warn);
		return this;
	}
	start(name,notes,...t){//[note...]
		for(let x of notes){
			const absn=this.ctx.createBufferSource(),
				sr=this.ab[name].reduce((a,y)=>Math.abs(y[0]-x)<Math.abs(a[0]-x)?y:a);
			absn.buffer=sr[1];console.log(sr[0]);
			absn.playbackRate.value=Math.pow(2,(x-sr[0])/12);
			absn.connect(this.ctx.destination);
			absn.start(...t);
		}
		return this;
	}
}
