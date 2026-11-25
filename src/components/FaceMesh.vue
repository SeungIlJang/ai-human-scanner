<script setup>
import { watch, ref, onMounted } from 'vue'
import { FaceLandmarker } from '@mediapipe/tasks-vision'
const props = defineProps({ landmarks: Array, mirrored: Boolean, sourceWidth: Number, sourceHeight: Number })
const canvas = ref(null)
function draw() {
  const el = canvas.value; if (!el) return
  el.width = el.clientWidth * devicePixelRatio; el.height = el.clientHeight * devicePixelRatio
  const ctx = el.getContext('2d'); ctx.scale(devicePixelRatio, devicePixelRatio)
  const points = props.landmarks?.[0]; if (!points) return
  const sourceW=props.sourceWidth||el.clientWidth, sourceH=props.sourceHeight||el.clientHeight
  const scale=Math.max(el.clientWidth/sourceW,el.clientHeight/sourceH)
  const drawW=sourceW*scale,drawH=sourceH*scale,offsetX=(el.clientWidth-drawW)/2,offsetY=(el.clientHeight-drawH)/2
  const x = p => offsetX+(props.mirrored ? 1-p.x : p.x)*drawW, y = p => offsetY+p.y*drawH
  ctx.strokeStyle = 'rgba(0,255,170,.42)'; ctx.lineWidth = .6
  for (const {start,end} of FaceLandmarker.FACE_LANDMARKS_TESSELATION) { const p=points[start],q=points[end]; if (!p||!q) continue; ctx.beginPath();ctx.moveTo(x(p),y(p));ctx.lineTo(x(q),y(q));ctx.stroke() }
  ctx.fillStyle = '#00ffaa'; for (const p of points) { ctx.beginPath();ctx.arc(x(p),y(p),1.1,0,Math.PI*2);ctx.fill() }
}
watch(() => [props.landmarks, props.mirrored, props.sourceWidth, props.sourceHeight], draw, { deep: false }); onMounted(draw)
</script><template><canvas ref="canvas" aria-hidden="true" /></template>
