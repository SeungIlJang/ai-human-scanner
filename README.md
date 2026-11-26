# 모두의 인성측정

얼굴 특징점을 기기 안에서 시각화하고, 얼굴 비율과 좌우 균형을 측정해 재미용 관상 점수를 보여주는 Vue 3 모바일 웹앱입니다. 실제 인성, 성격, 거짓말 횟수는 측정하지 않습니다.

## 실행

Node.js 20.19 이상(20.x) 또는 22.12 이상과 npm이 필요합니다. Vite 8의 요구 사항입니다.

```bash
npm ci
npm run dev
```

브라우저에서 표시된 주소를 엽니다. 카메라는 `localhost` 또는 HTTPS에서만 동작합니다. 휴대폰에서 로컬 서버를 테스트할 때는 HTTPS 터널이나 HTTPS 개발 서버를 사용하세요.

```bash
npm test
npm run build
npm run preview
```

## 기능

- 전면/후면 카메라, 안정적인 얼굴 인식 후 자동 촬영, 수동 촬영, 갤러리 업로드
- 업로드한 사진도 1280px 이하로 줄인 뒤 정면 여부·조명·선명도를 확인
- 앱이 백그라운드로 가면 카메라를 해제하고 돌아오면 다시 열며, 카메라 오류 시 다시 시도 또는 사진 분석으로 전환
- 결과 텍스트 공유(Web Share API, 미지원 브라우저는 클립보드 복사). 사진은 공유하지 않음
- 카메라에서는 1명 추적 모드의 MediaPipe 시간축 보정을 사용하고, 촬영 사진은 정지 이미지 모드에서 다시 분석해 여러 얼굴을 확인
- MediaPipe Face Landmarker 특징점 478개와 연결선 HUD
- 사진 속 눈 너비, 볼 간격, 입꼬리 간격의 좌우 균형을 평균한 관상 스캔 점수와 얼굴 비율 표시
- 4초 스캔, 단계 메시지, 완료음, 점수 카운트 애니메이션
- 인성 점수, 거짓말 횟수, 못된 점수, 잔머리 지수, 전생 직업, 동물 유형을 얼굴 스캔 아래 표시하고 못된 짓 횟수 등은 하단의 다른 점수에서 펼쳐 보기
- Hash Router, GitHub Pages 자동 배포, 요청 시 로컬 모델/WASM 캐시

점수 범위는 `src/data/score-config.json`에서 관리합니다. `src/services/physiognomyScore.js`는 전통 관상 분류의 적용 대상과 얼굴 측정값을 결합해 재미용 점수를 생성합니다. 점수는 비율에 따라 점진적으로 변합니다. 카메라는 가이드 안에서 정면·표정·조명·선명도를 확인하고, 안정된 여러 프레임의 중앙값을 점수에 사용합니다.

## 경량화와 오프라인 사용

Vue/Vite만 UI에 사용하고 무거운 UI 컴포넌트 라이브러리는 사용하지 않습니다. 얼굴 분석 라이브러리와 결과 화면은 처음부터 내려받지 않고, 필요한 기능을 열 때 로드합니다. PWA 서비스 워커는 홈 화면과 실제로 요청한 파일을 캐시합니다. `vite.config.js`가 빌드할 때 `sw.js`의 캐시 이름에 해시를 넣습니다. 앱 캐시는 빌드마다 바뀌고, 모델·WASM 캐시는 해당 파일이 바뀔 때만 바뀌므로 `sw.js`의 버전을 직접 올릴 필요가 없습니다. 따라서 **최초 얼굴 분석을 온라인에서 완료한 뒤** 해당 기기에서 오프라인 분석을 사용할 수 있습니다.

MediaPipe 1.x는 WebAssembly SIMD 전용 WASM만 제공합니다(약 14.7MB, 전송 시 압축됨). SIMD를 지원하지 않는 오래된 브라우저에는 업데이트 안내를 표시합니다. 최신 Android Chrome 및 iPhone Safari를 대상으로 합니다. `@mediapipe/tasks-vision` 버전을 바꾸면 `node_modules/@mediapipe/tasks-vision/wasm/`의 `vision_wasm_internal.js`와 `.wasm`을 `public/wasm/`에 다시 복사하세요.

## GitHub Pages 배포

1. 이 폴더를 GitHub 저장소의 **루트**에 올립니다.
2. 저장소의 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 설정합니다.
3. `main` 브랜치에 푸시하면 `.github/workflows/deploy.yml`이 테스트, 빌드, 배포를 실행합니다.

Vite `base`는 Actions의 `GITHUB_REPOSITORY`에서 저장소 이름을 읽어 `/<repo>/`로 설정합니다. 로컬에서는 `/`입니다. 사용자/조직 루트 저장소(`*.github.io`)는 `vite.config.js`의 `base`를 `/`로 바꾸세요.

공유 미리보기(OG 태그)의 주소는 `https://<owner>.github.io/<repo>/`로 만듭니다. 사용자 지정 도메인을 쓰면 빌드 환경 변수 `SITE_URL`에 사이트 주소를 넣으세요. `public/og-image.png`가 미리보기 이미지입니다.

## 개인정보

사진과 얼굴 특징점은 앱의 메모리에서만 처리합니다. LocalStorage와 백엔드를 사용하지 않습니다. 홈으로 돌아가거나 다시 분석하면 세션 데이터를 초기화합니다. 촬영 대상자의 동의를 받고 사용하세요.

MediaPipe는 입력 이미지가 기기에서 처리되고 Google로 보내지지 않는다고 설명하지만, **API 성능·사용량 지표를 Google로 전송한다**는 점과 **앱 운영자가 사용자 동의를 받을 책임**을 별도 [개인정보 안내](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/vision/README.md#privacy-notice)에 명시합니다. 홈 화면의 **개인정보 안내**에 이 내용과 링크, 오픈소스 라이선스 링크를 표시합니다. 별도 동의 절차가 필요한지는 배포 전에 검토하세요.

## 오픈소스와 모델

- Vue와 Vite는 MIT 오픈소스입니다. PWA 서비스 워커는 프로젝트 자체 코드입니다.
- `@mediapipe/tasks-vision` 패키지의 `license` 필드는 Apache-2.0입니다. `public/wasm/`은 설치한 동일 버전 패키지의 파일 사본입니다.
- `public/models/face_landmarker.task`는 [Google 공식 모델 URL](https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task)에서 내려받았습니다. SHA-256: `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`.
- [Face Mesh 모델 카드](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Face%20Mesh%20V2.pdf)는 Apache-2.0을 표기합니다. 다만 해당 카드가 이 **정확한 `.task` 번들의 모든 구성요소**의 상업적 재배포 권리를 명시하는지는 별도 확인이 필요합니다. 상업 서비스로 공개하기 전 Google의 해당 번들 라이선스와 고지 요건을 확인하세요.

## 확인한 내용과 한계

`npm test`에서 측정·점수 계산·자동 촬영 조건·촬영 품질 검사를 확인하고, 극단적인 비율을 포함한 500개 측정값 조합에서 점수 범위를 확인합니다. `npm run build`로 PWA 파일을 생성했습니다. Android Chrome, iPhone Safari, 실제 전·후면 카메라, 권한 거부, 배포된 GitHub Pages는 이 개발 환경에서 실기기 검증이 필요합니다.
