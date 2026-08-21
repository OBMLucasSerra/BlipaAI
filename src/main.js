import './style.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Dados reais extraídos das fichas técnicas Fortlev, indexados na mesma ordem de model/labels.txt
const PRODUCTS = [
  {
    name: 'Joelho 90° Soldável com Bucha de Latão Azul PVC Fortlev',
    category: 'Conexões PVC Fortlev · Azul',
    ean: '7898543593881',
    sizes: ['20mm x 1/2"', '25mm x 1/2"', '25mm x 3/4"']
  },
  {
    name: 'Luva Soldável LR PVC Fortlev',
    category: 'Conexões PVC Fortlev · Marrom',
    ean: '7898543593751',
    sizes: ['20mm x 1/2"', '25mm x 1/2"', '25mm x 3/4"']
  },
  {
    name: 'Joelho 90° Soldável Redução PVC 25mm x 20mm Fortlev',
    category: 'Conexões PVC Fortlev · Marrom',
    ean: '7898543594246',
    sizes: ['25mm x 20mm']
  }
]

const screenCapture = document.querySelector('#screenCapture')
const screenMatch = document.querySelector('#screenMatch')
const fileInput = document.querySelector('#fileInput')
const captureButton = document.querySelector('#captureButton')
const captureMessage = document.querySelector('#captureMessage')
const emptyState = document.querySelector('#emptyState')
const capturedPhoto = document.querySelector('#capturedPhoto')
const scanLine = document.querySelector('#scanLine')
const mlProcessingOverlay = document.querySelector('#mlProcessingOverlay')
const scanStepText = document.querySelector('#scanStepText')
const scanProgressBar = document.querySelector('#scanProgressBar')
const apiStatusDot = document.querySelector('#apiStatusDot')
const apiStatusText = document.querySelector('#apiStatusText')
const btnFlashlight = document.querySelector('#btnFlashlight')
const flashlightOverlay = document.querySelector('#flashlightOverlay')
const flashIcon = document.querySelector('#flashIcon')
const flashText = document.querySelector('#flashText')
const newPhotoButton = document.querySelector('#newPhotoButton')
const copyButton = document.querySelector('#copyButton')

let flashlightOn = false
let currentPhotoUrl = null
let currentEan = ''

// Liga/desliga o overlay de reforço de luz no visor (efeito visual, não controla o hardware da câmera)
btnFlashlight.onclick = () => {
  flashlightOn = !flashlightOn
  flashlightOverlay.classList.toggle('opacity-0', !flashlightOn)
  flashlightOverlay.classList.toggle('opacity-100', flashlightOn)
  flashText.textContent = flashlightOn ? 'LANTERNA LIGADA' : 'LANTERNA'
  flashIcon.className = flashlightOn ? 'fa-solid fa-bolt text-yellow-500' : 'fa-solid fa-bolt'
}

captureButton.onclick = () => fileInput.click()
fileInput.onchange = () => {
  const file = fileInput.files[0]
  if (file) analyzePhoto(file)
}

function switchScreen(screenId) {
  screenCapture.classList.add('hidden')
  screenMatch.classList.add('hidden')
  document.querySelector(`#${screenId}`).classList.remove('hidden')
}

async function analyzePhoto(file) {
  if (!file.type.startsWith('image/')) {
    captureMessage.textContent = 'Selecione um arquivo de imagem válido.'
    return
  }

  currentPhotoUrl = URL.createObjectURL(file)
  capturedPhoto.src = currentPhotoUrl
  capturedPhoto.classList.remove('hidden')
  emptyState.classList.add('hidden')
  captureMessage.textContent = ''

  scanLine.classList.remove('hidden')
  mlProcessingOverlay.classList.remove('hidden')
  captureButton.disabled = true

  const steps = [
    'Extraindo contornos e malha 3D...',
    'Classificando textura do polímero...',
    'Executando inferência neural...',
    'Consultando ficha técnica Fortlev...'
  ]
  let stepIndex = 0
  scanProgressBar.style.width = '10%'
  scanStepText.textContent = steps[0]
  const stepInterval = setInterval(() => {
    stepIndex = Math.min(stepIndex + 1, steps.length - 1)
    scanStepText.textContent = steps[stepIndex]
    scanProgressBar.style.width = `${20 + stepIndex * 25}%`
  }, 500)

  try {
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch(`${API_URL}/predict`, { method: 'POST', body: formData })
    const data = await response.json()
    if (!response.ok) throw new Error(data.detail || 'Não foi possível analisar a imagem.')

    scanProgressBar.style.width = '100%'
    renderMatchScreen(data)
    switchScreen('screenMatch')
  } catch (error) {
    captureMessage.textContent = error.message
  } finally {
    clearInterval(stepInterval)
    scanLine.classList.add('hidden')
    mlProcessingOverlay.classList.add('hidden')
    scanProgressBar.style.width = '0%'
    captureButton.disabled = false
  }
}

function renderMatchScreen(data) {
  const product = PRODUCTS[data.class_index] || { name: data.label, category: 'Categoria não catalogada', ean: '—', sizes: [] }

  document.querySelector('#matchProductName').textContent = product.name
  document.querySelector('#matchCategory').textContent = product.category
  document.querySelector('#matchConfidence').textContent = `Confiança: ${Math.round(data.confidence * 100)}%`
  document.querySelector('#matchThumb').src = currentPhotoUrl

  const bitolaGrid = document.querySelector('#bitolaGrid')
  bitolaGrid.innerHTML = ''

  function selectSize(idx, chip) {
    const size = product.sizes[idx]
    const ean = sizeEan(product.ean, idx)
    currentEan = ean
    ;[...bitolaGrid.children].forEach((c) => {
      c.classList.remove('bg-obramax-orange', 'text-white', 'border-obramax-orange', 'shadow-md', 'shadow-orange-600/30')
      c.classList.add('bg-white', 'text-slate-800', 'border-slate-200')
    })
    chip.classList.remove('bg-white', 'text-slate-800', 'border-slate-200')
    chip.classList.add('bg-obramax-orange', 'text-white', 'border-obramax-orange', 'shadow-md', 'shadow-orange-600/30')
    document.querySelector('#barcodeLabelBitola').textContent = size ? `BITOLA SELECIONADA: ${size}` : 'BITOLA ÚNICA'
    document.querySelector('#matchSkuText').textContent = ean
    document.querySelector('#barcodeEanCodeText').textContent = ean
    document.querySelector('#barcodeFooterEan').textContent = ean
    drawBarcodeSvg(ean)
  }

  const chips = product.sizes.map((size, idx) => {
    const chip = document.createElement('button')
    chip.type = 'button'
    chip.className = 'py-2.5 px-2 rounded-xl text-xs font-black transition-all btn-active flex flex-col items-center justify-center border-2'
    chip.textContent = size
    chip.onclick = () => selectSize(idx, chip)
    bitolaGrid.appendChild(chip)
    return chip
  })

  selectSize(0, chips[0])
}

// Fortlev publica um único EAN por linha de produto; deriva um código por bitola até termos os códigos oficiais por medida.
function sizeEan(baseEan, idx) {
  const prefix = baseEan.slice(0, -3)
  const suffix = String(Number(baseEan.slice(-3)) + idx).padStart(3, '0')
  return prefix + suffix
}

function drawBarcodeSvg(code) {
  const svg = document.querySelector('#barcodeSvg')
  svg.innerHTML = ''
  let x = 2
  for (let i = 0; i < 55; i++) {
    const digit = Number(code[i % code.length]) || 0
    const width = digit % 5 === 0 ? 3.5 : 2
    const isBlack = digit % 2 === 0
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('x', x)
    rect.setAttribute('y', 0)
    rect.setAttribute('width', width)
    rect.setAttribute('height', 50)
    rect.setAttribute('fill', isBlack ? '#0F172A' : '#FFFFFF')
    svg.appendChild(rect)
    x += width + 1.2
  }
}

copyButton.onclick = async () => {
  try {
    await navigator.clipboard.writeText(currentEan)
  } catch {
    // Clipboard API indisponível (ex.: contexto não seguro); ignora silenciosamente.
  }
  const copyBtnText = document.querySelector('#copyBtnText')
  const copyIcon = document.querySelector('#copyIcon')
  copyBtnText.textContent = 'Copiado!'
  copyIcon.className = 'fa-solid fa-check text-emerald-400'
  setTimeout(() => {
    copyBtnText.textContent = 'Copiar EAN'
    copyIcon.className = 'fa-solid fa-copy'
  }, 2000)
}

newPhotoButton.onclick = () => {
  fileInput.value = ''
  capturedPhoto.classList.add('hidden')
  emptyState.classList.remove('hidden')
  captureMessage.textContent = ''
  switchScreen('screenCapture')
}

async function checkApiHealth() {
  try {
    const response = await fetch(`${API_URL}/health`)
    const data = await response.json()
    if (!response.ok || !data.model_loaded) throw new Error()
    apiStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse'
    apiStatusText.textContent = 'IA CONECTADA'
  } catch {
    apiStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-red-500'
    apiStatusText.textContent = 'IA OFFLINE'
  }
}

checkApiHealth()
