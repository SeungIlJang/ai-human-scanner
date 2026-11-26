export const DISCLAIMER='재미용 가상 시뮬레이션입니다. 실제 인성, 성격, 거짓말 횟수를 측정한 결과가 아닙니다.'
export async function makeShareImage(image, character) {
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const c=canvas.getContext('2d')
  c.fillStyle='#0a0f1c';c.fillRect(0,0,1080,1350);c.strokeStyle='#00ffaa';c.lineWidth=4;c.strokeRect(32,32,1016,1286)
  c.fillStyle='#00ffaa';c.font='bold 32px sans-serif';c.fillText('✳ AI HUMAN SCANNER',75,105)
  c.fillStyle='#fff';c.font='bold 50px sans-serif';c.fillText('관상 기반 캐릭터 카드',75,180)
  const photo=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=image})
  const side=Math.min(photo.width,photo.height),sx=(photo.width-side)/2,sy=(photo.height-side)/2;c.save();c.beginPath();c.roundRect(75,220,410,410,20);c.clip();c.drawImage(photo,sx,sy,side,side,75,220,410,410);c.restore()
  c.fillStyle='#00ffaa';c.font='bold 112px sans-serif';c.fillText(`${character.total}점`,540,450,440)
  c.fillStyle='#fff';c.font='bold 41px sans-serif';c.fillText(character.title,540,525,440)
  c.fillStyle='#00bfff';c.font='bold 30px sans-serif';c.fillText('캐릭터 능력치',75,710)
  character.stats.forEach((stat, index) => {
    const y = 780 + index * 115
    c.fillStyle='#fff';c.font='bold 34px sans-serif';c.fillText(`${stat.label}  ${stat.value}점`,75,y)
    c.fillStyle='#a9c2cb';c.font='26px sans-serif'
    c.fillText(`${stat.balance} ${stat.measuredBalance}점 · ${stat.ratioLabel} ${stat.measuredRatio}%`,75,y+42,920)
  })
  c.fillStyle='#ffcf62';c.font='25px sans-serif';c.fillText('사진 속 얼굴 특징을 게임 규칙으로 해석한 오락용 결과입니다.',75,1220,920)
  return await new Promise(resolve=>canvas.toBlob(resolve,'image/png'))
}
export function downloadBlob(blob){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='ai-human-scanner-result.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
