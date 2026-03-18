(function(){

let oscs = []
let filter = null
let reverb = null
let masterVol = null

// Fondamentale bien présente, harmoniques nettement en retrait
const HARM_VOLUMES = [-7, -20, -32]

// Petit helper
function rand(min, max){
  return min + Math.random() * (max - min)
}

function buildOscs(bowl){

  if(!bowl || !bowl.harmRatios) return []

  return bowl.harmRatios.map((ratio, i) => {

    const osc = new Tone.Oscillator({
      frequency: bowl.baseFreq * ratio,
      type: i === 0 ? "sine" : "triangle",
      detune: rand(-4, 4) // légère instabilité naturelle
    })

    osc.volume.value = HARM_VOLUMES[i] ?? -36
    osc.connect(filter)

    return osc
  })
}

async function initAudio(state){

  if(!state || state.audioReady) return

  await Tone.start()

  // Master plus bas pour éviter toute sensation dure
  masterVol = new Tone.Volume(-24).toDestination()

  reverb = new Tone.Reverb({
    decay: 10,
    preDelay: 0.06,
    wet: 0.58
  })

  await reverb.ready
  reverb.connect(masterVol)

  // Lowpass doux, plus "bol" que "synth drone"
  filter = new Tone.Filter({
    type: "lowpass",
    frequency: 650,
    rolloff: -24,
    Q: 0.65
  })

  filter.connect(reverb)

  oscs = buildOscs(state.bowl)
  state.audioReady = true
}

function startOscs(state){

  if(!state || !state.audioReady) return

  // fade-in pour éviter l'entrée trop brusque
  masterVol.volume.value = -40

  oscs.forEach(o => {
    try{ o.start() }catch(e){}
  })

  const startupVol = -30 + (state.intensity * 10)
  masterVol.volume.rampTo(startupVol, 1.6)

  state.playing = true
}

function stopOscs(state){

  if(!state) return

  // arrêt un peu plus propre
  try{
    masterVol.volume.rampTo(-40, 0.4)
  }catch(e){}

  setTimeout(() => {
    oscs.forEach(o => {
      try{ o.stop() }catch(e){}
    })
  }, 380)

  state.playing = false
}

function disposeOscs(){

  oscs.forEach(o => {
    try{ o.dispose() }catch(e){}
  })

  oscs = []
}

async function switchBowl(state, bowl){

  if(!state || !bowl) return

  const wasPlaying = state.playing

  if(wasPlaying) stopOscs(state)

  setTimeout(() => {
    disposeOscs()

    state.bowl = bowl

    if(!state.audioReady) return

    oscs = buildOscs(bowl)

    if(wasPlaying){
      startOscs(state)
      updateSound(state)
    }
  }, wasPlaying ? 420 : 0)
}

function updateSound(state){

  if(!state || !state.audioReady || !state.playing) return

  const t =
    (((state.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2)

  // courbe douce, plus organique
  const curved = t * t * (3 - 2 * t)

  // Filtre adapté au bol mais plafonné pour éviter les aigus agressifs
  const fMin = Math.max(180, state.bowl.baseFreq * 0.75)
  const fMax = Math.min(
    state.bowl.filterRange[1],
    state.bowl.baseFreq * 2.15
  )

  const fFreq = fMin + (fMax - fMin) * curved

  // double dérive lente pour casser le drone figé
  const drift =
    Math.sin(Date.now() * 0.00033) * 10 +
    Math.sin(Date.now() * 0.00008) * 16

  filter.frequency.rampTo(fFreq + drift, 0.22)

  // Q très doux
  const qVal = 0.45 + curved * 0.35
  filter.Q.rampTo(qVal, 0.16)

  // respiration lente du master
  const targetVol = -30 + (state.intensity * 12)
  const breath = Math.sin(Date.now() * 0.00052) * 1.6
  masterVol.volume.rampTo(targetVol + breath, 0.2)

  // Reverb
  const wet =
    state.bowl.reverbRange[0] +
    (state.bowl.reverbRange[1] - state.bowl.reverbRange[0]) * state.space

  reverb.wet.rampTo(wet, 0.24)

  state.pulse = Math.min(1, state.pulse + 0.04)
}

function getAudioDebug(){
  return {
    hasFilter: !!filter,
    hasReverb: !!reverb,
    hasMasterVol: !!masterVol,
    oscCount: oscs.length
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
