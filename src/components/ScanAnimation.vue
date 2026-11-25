<script setup>
import { ref } from 'vue'
import FaceMesh from './FaceMesh.vue'
defineProps({ image: String, landmarks: Array, progress: Number })
const dimensions=ref({width:0,height:0})
</script><template><div class="camera-frame scan-frame glow"><img :src="image" alt="선택한 얼굴 사진" @load="dimensions={width:$event.target.naturalWidth,height:$event.target.naturalHeight}" /><FaceMesh :landmarks="landmarks" :source-width="dimensions.width" :source-height="dimensions.height" /><div class="hud"></div><div class="scanline"></div><div class="scan-info">SCANNING // {{ progress }}%</div></div></template><style scoped>.scan-frame{width:100%;max-width:430px}</style>
