(function(){

let oscs = []
let filter = null
let reverb = null
let masterVol = null

function buildOscs(bowl){

  if(!bowl || !bowl.harmRatios) return []

  return bowl.harmRatios.map((ratio,i)=>{

    const osc = new Tone.Oscillator({
      frequency: bowl.baseFreq * ratio,
      type: i === 0 ? "sine" : "triangle"
    })

    osc.volume.value = [-10,-24,-36][i] ?? -36

    osc.connect(filter)

    return osc

  })

}

async function initAudio(state){

  if(!state || state.audioReady) return

  await Tone.start()

  masterVol = new Tone.Volume(-14).toDestination()

  reverb = new Tone.Reverb({
    decay:9,
    preDelay:0.05,
    wet:0.55
  })

  await reverb.ready

  reverb.connect(masterVol)

  filter = new Tone.Filter({
    type:"lowpass",
    frequency:900,
    Q:0.8
  })

  filter.connect(reverb)

  oscs = buildOscs(state.bowl)

  state.audioReady = true

}

function startOscs(state){

  if(!state || !state.audioReady) return

  oscs.forEach(o=>{
    try{o.start()}catch(e){}
  })

  state.playing = true

}

function stopOscs(state){

  if(!state) return

  oscs.forEach(o=>{
    try{o.stop()}catch(e){}
  })

  state.playing = false

}

function disposeOscs(){

  oscs.forEach(o=>{
    try{o.dispose()}catch(e){}
  })

  oscs = []

}

async function switchBowl(state,bowl){

  if(!state || !bowl) return

  const wasPlaying = state.playing

  if(wasPlaying) stopOscs(state)

  disposeOscs()

  state.bowl = bowl

  if(!state.audioReady) return

  oscs = buildOscs(bowl)

  if(wasPlaying){
    startOscs(state)
    updateSound(state)
  }

}

function updateSound(state){

  if(!state || !state.audioReady || !state.playing) return

  const t =
  (((state.angle % (Math.PI*2))+Math.PI*2)%(Math.PI*2))/(Math.PI*2)

  const curved = t*t*(3-2*t)

  /* filtre adapté au bowl */

  const fMin = state.bowl.baseFreq * 0.8

  const fMax = Math.min(
    state.bowl.baseFreq * 4,
    state.bowl.filterRange[1]
  )

  const fFreq = fMin + (fMax - fMin) * curved

  const drift =
  Math.sin(Date.now()*0.00045) * 2

  filter.frequency.rampTo(fFreq + drift,0.16)

  const qVal = 0.7 + curved * 0.6

  filter.Q.rampTo(qVal,0.12)

  /* volume stable */

  const targetVol =
  -22 + (state.intensity * 12)

  masterVol.volume.rampTo(targetVol,0.12)

  const wet =
  state.bowl.reverbRange[0] +
  (state.bowl.reverbRange[1] - state.bowl.reverbRange[0]) * state.space

  reverb.wet.rampTo(wet,0.22)

  state.pulse = Math.min(1,state.pulse + 0.04)

}

function getAudioDebug(){

  return{
    hasFilter:!!filter,
    hasReverb:!!reverb,
    hasMasterVol:!!masterVol,
    oscCount:oscs.length
  }

}

window.SacredBowlAudio = {
  initAudio,
  startOscs,
  stopOscs,
  switchBowl,
  updateSound,
  getAudioDebug
}

})()