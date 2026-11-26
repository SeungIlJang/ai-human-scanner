export const DISCLAIMER='재미용 가상 시뮬레이션입니다. 실제 인성, 성격, 거짓말 횟수를 측정한 결과가 아닙니다.'
export async function makeShareImage(image, result, top, faceShape) {
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const c=canvas.getContext('2d')
  c.fillStyle='#0a0f1c';c.fillRect(0,0,1080,1350);c.strokeStyle='#00ffaa';c.lineWidth=4;c.strokeRect(32,32,1016,1286)
  c.fillStyle='#00ffaa';c.font='bold 32px sans-serif';c.fillText('✳ AI HUMAN SCANNER',75,105)
  c.fillStyle='#fff';c.font='bold 50px sans-serif';c.fillText('나의 가상 캐릭터 분석',75,180)
  const photo=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=image})
  const side=Math.min(photo.width,photo.height),sx=(photo.width-side)/2,sy=(photo.height-side)/2;c.save();c.beginPath();c.roundRect(75,220,410,410,20);c.clip();c.drawImage(photo,sx,sy,side,side,75,220,410,410);c.restore()
  c.fillStyle='#ffd700';c.font='bold 190px sans-serif';c.fillText(result.grade,555,455)
  c.fillStyle='#fff';c.font='bold 35px sans-serif';c.fillText(`${result.total}점 · ${result.title}`,540,525)
  c.fillStyle='#00bfff';c.font='bold 27px sans-serif';c.fillText('TOP 3 CHARACTER STATS',75,700)
  top.forEach((item,i)=>{c.fillStyle='#fff';c.font='28px sans-serif';c.fillText(`${i+1}. ${item.label}`,75,755+i*70);c.fillStyle='#00ffaa';c.fillText(`${item.value}점`,420,755+i*70)})
  c.fillStyle='#fff';c.font='28px sans-serif';c.fillText(`가상 누적 거짓말 횟수 ${result.lieCount.toLocaleString()}회`,75,1000);c.fillText(`전생 직업 · ${result.job}`,75,1060)
  if (faceShape) {
    c.fillStyle='#21d9a4'
    c.fillText(`관상 스캔 점수 ${faceShape.total}점 · 사진 속 얼굴 균형`,75,1120)
  }
  c.fillStyle='#ffcf62';c.font='22px sans-serif';c.fillText('재미용 가상 시뮬레이션입니다.',75,1190);c.fillText('실제 인성, 성격, 거짓말 횟수를 측정한 결과가 아닙니다.',75,1230)
  return await new Promise(resolve=>canvas.toBlob(resolve,'image/png'))
}
export function downloadBlob(blob){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='ai-human-scanner-result.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
