(function(){

let oscs = []
let filter = null
let reverb = null
let masterVol = null

// ── Volumes par harmonique : fondamentale bien présente,
//    harmoniques nettement atténuées pour éviter l'agressivité
const HARM_VOLUMES = [-6, -18, -30]

function buildOscs(bowl){

  if(!bowl || !bowl.harmRatios) return []

  return bowl.harmRatios.map((ratio, i) => {

    // Fondamentale en sinus, harmoniques en triangle (plus doux que sine pur)
    const osc = new Tone.Oscillator({
      frequency: bowl.baseFreq * ratio,
      type: i === 0 ? "sine" : "triangle"
    })

    osc.volume.value = HARM_VOLUMES[i] ?? -36

    osc.connect(filter)

    return osc

  })

}

async function initAudio(state){

  if(!state || state.audioReady) return

  await Tone.start()

  // Volume master légèrement réduit pour éviter la saturation
  masterVol = new Tone.Volume(-18).toDestination()

  reverb = new Tone.Reverb({
    decay: 9,
    preDelay: 0.05,
    wet: 0.55
  })

  await reverb.ready

  reverb.connect(masterVol)

  // Filtre passe-bas plus fermé au départ pour tempérer les aigus
  filter = new Tone.Filter({
    type: "lowpass",
    frequency: 700,
    rolloff: -24,   // pente plus douce qu'une coupure brutale
    Q: 0.7
  })

  filter.connect(reverb)

  oscs = buildOscs(state.bowl)

  state.audioReady = true

}

function startOscs(state){

  if(!state || !state.audioReady) return

  oscs.forEach(o => {
    try{ o.start() }catch(e){}
  })

  state.playing = true

}

function stopOscs(state){

  if(!state) return

  oscs.forEach(o => {
    try{ o.stop() }catch(e){}
  })

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
    (((state.angle % (Math.PI*2)) + Math.PI*2) % (Math.PI*2)) / (Math.PI*2)

  // Courbe smoothstep — donne un mouvement plus organique
  const curved = t * t * (3 - 2 * t)

  // ── Fréquence du filtre ──────────────────────────────────────────────
  // On bride le max à 2× la fondamentale pour éviter les harmoniques
  // trop criardes (problème principal du Heart à 341 Hz)
  const fMin = state.bowl.filterRange[0]
  const fMax = Math.min(
    state.bowl.filterRange[1],
    state.bowl.baseFreq * 2.2   // plafond relatif à la fondamentale
  )

  const fFreq = fMin + (fMax - fMin) * curved

  // Légère dérive pour simuler le jeu de la baguette
  const drift = Math.sin(Date.now() * 0.00045) * 1.5

  filter.frequency.rampTo(fFreq + drift, 0.18)

  // Q modéré — évite la résonance perçante
  const qVal = 0.5 + curved * 0.4
  filter.Q.rampTo(qVal, 0.14)

  // ── Volume master ────────────────────────────────────────────────────
  // Plage [-28, -16] dB : plus confortable que l'ancienne [-22, -10]
  const targetVol = -28 + (state.intensity * 12)
  masterVol.volume.rampTo(targetVol, 0.12)

  // ── Reverb ───────────────────────────────────────────────────────────
  const wet =
    state.bowl.reverbRange[0] +
    (state.bowl.reverbRange[1] - state.bowl.reverbRange[0]) * state.space

  reverb.wet.rampTo(wet, 0.22)

  state.pulse = Math.min(1, state.pulse + 0.04)

}

function getAudioDebug(){
  return {
    hasFilter:    !!filter,
    hasReverb:    !!reverb,
    hasMasterVol: !!masterVol,
    oscCount:     oscs.length
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
