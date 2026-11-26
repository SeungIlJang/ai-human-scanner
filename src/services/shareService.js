export const DISCLAIMER='재미용 가상 시뮬레이션입니다. 실제 인성, 성격, 거짓말 횟수를 측정한 결과가 아닙니다.'
export async function makeShareImage(image, character) {
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const c=canvas.getContext('2d')
  c.fillStyle='#0a0f1c';c.fillRect(0,0,1080,1350);c.strokeStyle='#00ffaa';c.lineWidth=4;c.strokeRect(32,32,1016,1286)
  c.fillStyle='#00ffaa';c.font='bold 32px sans-serif';c.fillText('✳ AI HUMAN SCANNER',75,105)
  c.fillStyle='#fff';c.font='bold 50px sans-serif';c.fillText('관상 캐릭터 · 오락용 가상 결과',75,180,930)
  character.highlights.forEach((item, index) => {
    const x = 75 + (index % 2) * 475
    const y = 225 + Math.floor(index / 2) * 145
    c.fillStyle='#142e2b';c.fillRect(x,y,445,125)
    c.fillStyle='#d4ece6';c.font='28px sans-serif';c.fillText(item.label,x+20,y+36,400)
    c.fillStyle='#6af3c8';c.font='bold 50px sans-serif'
    c.fillText(`${item.value.toLocaleString('ko-KR')}${item.unit}`,x+20,y+96,400)
  })
  const photo=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=image})
  const side=Math.min(photo.width,photo.height),sx=(photo.width-side)/2,sy=(photo.height-side)/2;c.save();c.beginPath();c.roundRect(75,545,350,350,20);c.clip();c.drawImage(photo,sx,sy,side,side,75,545,350,350);c.restore()
  c.fillStyle='#00ffaa';c.font='bold 93px sans-serif';c.fillText(`${character.total}점`,490,735,450)
  c.fillStyle='#fff';c.font='bold 39px sans-serif';c.fillText(character.title,490,805,450)
  c.fillStyle='#00bfff';c.font='bold 30px sans-serif';c.fillText('게임 능력치',75,970)
  character.stats.forEach((stat, index) => {
    const x = 75 + index * 320
    c.fillStyle='#fff';c.font='bold 34px sans-serif';c.fillText(`${stat.label} ${stat.value}점`,x,1045,300)
  })
  c.fillStyle='#ffcf62';c.font='25px sans-serif';c.fillText(DISCLAIMER,75,1220,920)
  return await new Promise(resolve=>canvas.toBlob(resolve,'image/png'))
}
export function downloadBlob(blob){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='ai-human-scanner-result.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
