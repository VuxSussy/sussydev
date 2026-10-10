import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

const canvas = document.querySelector('#scene');
const status = document.querySelector('#status');
const copies = [...document.querySelectorAll('.copy')];
const sections = [...document.querySelectorAll('.chapter')];
const navLinks = [...document.querySelectorAll('.chapter-nav a')];
const topLinks = [...document.querySelectorAll('.top-nav a')];
const motion = document.querySelector('#motion');
const preference = matchMedia('(prefers-reduced-motion: reduce)');
const captions = [
  ['SUSSYDEV / ROBLOX AVATAR', 'Một nhân vật. Một chút cá tính.'],
  ['UIT / EDUCATION', 'Học. Thử. Hiểu thêm một chút.'],
  ['THE TOOLKIT / IN MOTION', 'Những công cụ đằng sau mỗi ý tưởng.'],
  ['SUSSYDEV / STILL BUILDING', 'Lần thử tiếp theo bắt đầu ở đây.']
];
const toolData = [
  {name:'JavaScript',icon:'javascript',color:'#f7df1e',point:[-1.48,1.18,.3]},
  {name:'HTML',icon:'html5',color:'#f47746',point:[.15,1.8,-.25]},
  {name:'CSS',icon:'css',color:'#7ca8ff',point:[1.66,1.17,-.15]},
  {name:'Linux',icon:'linux',color:'#ffffff',point:[2.1,-.35,.2]},
  {name:'Blender',icon:'blender',color:'#ffab5e',point:[.7,-1.6,.35]},
  {name:'Git',icon:'git',color:'#ff795e',point:[-1.05,-1.62,.6]},
  {name:'Roblox Studio',icon:'robloxstudio',color:'#7db3ff',point:[-2.03,-.35,-.2]}
];
const smooth = (a,b,x) => THREE.MathUtils.smoothstep(x,a,b);
let renderer;

function fallback(error) {
  document.body.classList.remove('enhanced');
  document.body.classList.add('no-webgl');
  copies.forEach(copy => { copy.style.opacity=''; copy.style.transform=''; copy.querySelectorAll('a').forEach(a => a.removeAttribute('tabindex')); });
  motion.disabled=true;
  status.textContent='Bản 3D chưa mở được. Bạn vẫn có thể xem đầy đủ portfolio bên dưới.';
  const retry=document.createElement('button');
  retry.textContent='Thử tải lại 3D'; retry.type='button'; retry.addEventListener('click',()=>location.reload()); status.append(retry);
  console.error('sussydev 3D:',error);
}

async function toolModel(tool,edgeMaterial) {
  const data=await new SVGLoader().loadAsync('assets/'+tool.icon+'.svg');
  const shapes=data.paths.flatMap(path=>path.toShapes());
  if(!shapes.length) throw new Error('Empty tool logo: '+tool.icon);
  const geometry=new THREE.ExtrudeGeometry(shapes,{depth:1.8,steps:1,curveSegments:32,bevelEnabled:true,bevelThickness:.14,bevelSize:.14,bevelSegments:4});
  geometry.computeBoundingBox();
  const box=geometry.boundingBox;
  if(!Number.isFinite(box.max.x)||box.isEmpty()) throw new Error('Invalid tool logo: '+tool.icon);
  geometry.translate(...box.getCenter(new THREE.Vector3()).multiplyScalar(-1).toArray());
  const faceMaterial=new THREE.MeshPhysicalMaterial({color:tool.color,metalness:.58,roughness:.19,clearcoat:1,clearcoatRoughness:.1,transparent:true});
  const mesh=new THREE.Mesh(geometry,[faceMaterial,edgeMaterial]);mesh.castShadow=true;
  const silhouette=new THREE.Group();silhouette.add(mesh);silhouette.scale.set(.058,-.058,.058);
  const root=new THREE.Group();root.name=tool.name;root.userData.point=new THREE.Vector3(...tool.point);root.add(silhouette);
  return root;
}

function normalize(gltf,extent) {
  const object=gltf.scene;
  const box=new THREE.Box3().setFromObject(object);
  const size=box.getSize(new THREE.Vector3());
  const largest=Math.max(size.x,size.y,size.z);
  if (!Number.isFinite(largest)||largest<=0) throw new Error('Empty 3D model');
  object.position.sub(box.getCenter(new THREE.Vector3()));
  const group=new THREE.Group();group.add(object);group.scale.setScalar(extent/largest);
  object.traverse(child=>{
    if (!child.isMesh) return;
    child.castShadow=true;
    for (const material of Array.isArray(child.material)?child.material:[child.material]) {
      material.userData.originalOpacity=material.opacity;
      material.transparent=true;
      for(const value of Object.values(material)) if(value?.isTexture) value.anisotropy=renderer.capabilities.getMaxAnisotropy();
    }
  });
  const root=new THREE.Group();root.add(group);
  return root;
}

function fade(object,weight) {
  object.visible=weight>.001;
  object.traverse(child=>{
    if (!child.isMesh) return;
    for (const material of Array.isArray(child.material)?child.material:[child.material]) {
      material.opacity=(material.userData.originalOpacity??1)*weight;
      material.depthWrite=weight>.98;
    }
  });
}

try {
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(2,Math.max(devicePixelRatio,1.5)));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.04;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#202326');
  scene.fog=new THREE.Fog('#202326',18,36);
  const camera=new THREE.PerspectiveCamera(35,1,.1,80);
  const environment=new RoomEnvironment();
  const softbox=new THREE.MeshBasicMaterial({color:new THREE.Color(4,4,4),side:THREE.DoubleSide});
  for(const [x,y,z,width,height] of [[-4,2,4,2.3,6],[4,3,1,2,5],[0,6,-2,7,2]]) {
    const panel=new THREE.Mesh(new THREE.PlaneGeometry(width,height),softbox);panel.position.set(x,y,z);panel.lookAt(0,0,0);environment.add(panel);
  }
  const pmrem=new THREE.PMREMGenerator(renderer);
  const environmentMap=pmrem.fromScene(environment,.015);
  scene.environment=environmentMap.texture;scene.environmentIntensity=1.15;
  environment.dispose();pmrem.dispose();
  scene.add(new THREE.HemisphereLight('#d6dbe2','#35302b',.6));
  const key=new THREE.SpotLight('#aacaff',250,35,Math.PI/5,.85,2);key.position.set(-3,6,8);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.normalBias=.018;scene.add(key);
  const rim=new THREE.SpotLight('#ffb28b',230,35,Math.PI/4,1,2);rim.position.set(4,4,-4);scene.add(rim);
  const fill=new THREE.DirectionalLight('#f4f3ee',1.3);fill.position.set(0,2,7);scene.add(fill);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:'#151719',metalness:.15,roughness:.65,envMap:environmentMap.texture,envMapIntensity:.22}));
  floor.rotation.x=-Math.PI/2;floor.position.y=-2.66;floor.receiveShadow=true;scene.add(floor);
  const plinth=new THREE.Mesh(new THREE.CylinderGeometry(1.95,2.03,.12,128),new THREE.MeshPhysicalMaterial({color:'#30353b',metalness:.8,roughness:.24,clearcoat:1,clearcoatRoughness:.15,envMap:environmentMap.texture,envMapIntensity:.55,transparent:true}));
  plinth.position.y=-2.55;plinth.receiveShadow=true;scene.add(plinth);
  const ringMaterial=new THREE.MeshBasicMaterial({color:'#d6dbe2',transparent:true,opacity:.26});
  const ring=new THREE.Mesh(new THREE.TorusGeometry(2.04,.013,8,100),ringMaterial);ring.rotation.x=Math.PI/2;ring.position.y=-2.44;scene.add(ring);
  const ring2=ring.clone();ring2.scale.setScalar(1.21);ring2.position.y=-2.62;scene.add(ring2);

  const loader=new GLTFLoader();
  const edgeMaterial=new THREE.MeshPhysicalMaterial({color:'#d6dbe2',metalness:1,roughness:.18,clearcoat:1,clearcoatRoughness:.1,transparent:true});
  const [avatarFile,logoFile,logos]=await Promise.all([
    loader.loadAsync('models/roblox-avatar.glb'),loader.loadAsync('models/uit-logo.glb'),
    Promise.all(toolData.map(tool=>toolModel(tool,edgeMaterial)))
  ]);
  const avatar=normalize(avatarFile,4.8);scene.add(avatar);
  // Roblox faces -Z after the OBJ → Blender → glTF coordinate conversion.
  avatar.rotation.y=Math.PI;
  const logo=normalize(logoFile,4.6);scene.add(logo);
  const tools=new THREE.Group();scene.add(tools);
  logos.forEach(logo=>tools.add(logo));
  const count=150;
  const positions=new Float32Array(count*3),directions=new Float32Array(count*3);
  for(let i=0;i<count;i++) {
    const y=1-2*(i+.5)/count;const radius=Math.sqrt(1-y*y);const angle=i*Math.PI*(3-Math.sqrt(5));
    directions.set([Math.cos(angle)*radius,y,Math.sin(angle)*radius*.65],i*3);
  }
  const particlesGeometry=new THREE.BufferGeometry();particlesGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const particles=new THREE.Points(particlesGeometry,new THREE.PointsMaterial({color:'#b7e6ff',size:.022,transparent:true,depthWrite:false}));scene.add(particles);
  const shock=new THREE.Mesh(new THREE.TorusGeometry(1,.008,6,100),new THREE.MeshBasicMaterial({color:'#84c6ac',transparent:true,depthWrite:false}));scene.add(shock);

  let target=0,current=0,maxScroll=1,frame=0,last=performance.now(),elapsed=0,active=-1;
  let paused=false,lost=false,mobile=false;
  const reduced=()=>paused||preference.matches;
  const backgrounds=['#202326','#1c2636','#1c2c27','#302722'].map(color=>new THREE.Color(color));
  const accents=['#d6dbe2','#a9c2f4','#84c6ac','#dba282'].map(color=>new THREE.Color(color));
  const uiColor=new THREE.Color();
  function start(){if(!frame&&!document.hidden&&!lost)frame=requestAnimationFrame(render);}
  function updateTarget(){target=THREE.MathUtils.clamp(scrollY/maxScroll*3,0,3);start();}
  function resize(){
    const width=document.documentElement.clientWidth;const height=innerHeight;
    mobile=width<=700;
    renderer.setSize(width,height,false);camera.aspect=width/height;
    camera.clearViewOffset();
    if(mobile) camera.setViewOffset(width,height,0,height*.23,width,height);
    else camera.setViewOffset(width,height,-width*.19,0,width,height);
    camera.position.set(0,.5,mobile?Math.max(14,8.4/camera.aspect):11.6);
    camera.far=Math.max(80,camera.position.z+40);
    scene.fog.near=camera.position.z+6;scene.fog.far=camera.position.z+25;
    camera.lookAt(0,0,0);camera.updateProjectionMatrix();
    maxScroll=Math.max(1,document.documentElement.scrollHeight-height);updateTarget();
  }
  function updateMotion(){
    document.body.dataset.motion=reduced()?'reduced':'full';
    motion.setAttribute('aria-pressed',String(reduced()));motion.disabled=preference.matches;
    const label=preference.matches?'Thiết bị đã giảm chuyển động':reduced()?'Bật chuyển động':'Giảm chuyển động';
    motion.setAttribute('aria-label',label);motion.querySelector('span').textContent=label;start();
  }
  function updateCopy(p){
    const next=Math.round(p);
    copies.forEach((copy,index)=>{
      const difference=p-index;const opacity=reduced()?(next===index?1:0):1-smooth(.08,.48,Math.abs(difference));
      copy.style.opacity=String(opacity);
      const shift=reduced()?0:difference*-35;
      copy.style.transform=mobile?'translate3d(0,'+shift+'px,0)':'translate3d(0,calc(-50% + '+shift+'px),0)';
      copy.classList.toggle('is-active',next===index);
      copy.querySelectorAll('a').forEach(a=>{a.tabIndex=next===index?0:-1;});
    });
    if(next!==active){
      active=next;document.body.dataset.chapter=sections[next].id;
      [...navLinks,...topLinks].forEach(link=>{if(link.getAttribute('href')==='#'+sections[next].id)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
      document.querySelector('#chapter-count').value=String(next+1).padStart(2,'0');
      document.querySelector('.chapter-number').textContent=String(next+1).padStart(2,'0');
      document.querySelector('#caption-title').textContent=captions[next][0];document.querySelector('#caption-subtitle').textContent=captions[next][1];
      const final=next===3;document.querySelector('#scroll-cue').href=final?'#roblox':'#'+sections[next+1].id;
      document.querySelector('#scroll-label').textContent=final?'Về đầu trang':'Cuộn để khám phá';document.querySelector('#scroll-arrow').style.transform=final?'rotate(180deg)':'';
    }
    document.querySelector('.progress i').style.transform='scaleX('+(p/3)+')';
    document.querySelector('.model-caption').style.opacity=String(1-smooth(.2,.5,Math.abs(p-next)));
  }
  function render(now){
    frame=0;const delta=Math.min((now-last)/1000,.05);last=now;
    if(!reduced())elapsed+=delta;
    current=reduced()?target:THREE.MathUtils.lerp(current,target,1-Math.exp(-4.5*delta));
    if(Math.abs(current-target)<.00005)current=target;
    const p=reduced()?Math.round(current):current;
    const hero=1-smooth(.23,.92,p),learn=smooth(.3,.96,p)*(1-smooth(1.25,1.94,p)),final=smooth(2.42,2.97,p);
    const toolkit=smooth(1.38,1.96,p)*(1-smooth(2.42,3,p));
    const bob=reduced()?0:Math.sin(elapsed*.95)*.065;
    const out=smooth(.25,1,p);
    avatar.position.set(-out*.55*(1-final),bob-.3*out*(1-final),-out*.7*(1-final));
    avatar.scale.setScalar(THREE.MathUtils.lerp(1,.72,final));
    avatar.rotation.y=Math.PI+(reduced()?-.18:-.2+p*.65*(1-final)+Math.sin(elapsed*.27)*.045);
    fade(avatar,Math.max(hero,final));
    logo.position.set(.18*(1-learn),bob,.1);logo.scale.setScalar(.73+.27*learn);
    logo.rotation.set(.06, reduced()?-.12:(p-1)*.8+Math.sin(elapsed*.4)*.10,-.04);
    fade(logo,learn);
    const explosion=reduced()?1:smooth(1.42,2.16,p);
    tools.visible=toolkit+final>.001;
    tools.scale.setScalar(mobile?.87:1);
    logos.forEach((card,index)=>{
      const theta=index*Math.PI*2/logos.length+.28;
      const original=card.userData.point;
      card.position.set(
        THREE.MathUtils.lerp(original.x*explosion,Math.cos(theta)*2.02,final),
        THREE.MathUtils.lerp(original.y*explosion,Math.sin(theta)*1.7,final)+(reduced()?0:Math.sin(elapsed*.85+index)*.065),
        THREE.MathUtils.lerp(original.z*explosion,Math.sin(theta)*.5+.45,final)
      );
      card.scale.setScalar((.2+.8*explosion)*(1-.54*final));
      card.rotation.set((reduced()?0:Math.sin(elapsed*.4+index)*.06),original.x*.13+(reduced()?0:Math.sin(elapsed*.4+index)*.04),-original.x*.09*(1-final));
      fade(card,Math.max(toolkit,final*.8));
    });
    const flash=smooth(1.52,1.82,p)*(1-smooth(2.15,2.45,p));
    particles.visible=shock.visible=!reduced()&&flash>.001;
    if(particles.visible){
      for(let i=0;i<count;i++){
        const radius=(.25+3.3*explosion)*(1+.09*Math.sin(i*2.1+elapsed*.3));
        for(let axis=0;axis<3;axis++)positions[i*3+axis]=directions[i*3+axis]*radius;
      }
      particlesGeometry.attributes.position.needsUpdate=true;particles.material.opacity=flash*.52;
      shock.scale.setScalar(.5+3.9*explosion);shock.material.opacity=flash*(1-explosion)*.5;shock.rotation.z=elapsed*.07;
    }
    const platform=Math.max(hero,final*.85);plinth.visible=platform>.001;plinth.material.opacity=platform;
    ring.visible=ring2.visible=platform>.001;ringMaterial.opacity=platform*.34;
    const from=Math.min(2,Math.floor(p)),mix=p-from;
    scene.background.copy(backgrounds[from]).lerp(backgrounds[from+1],mix);scene.fog.color.copy(scene.background);
    uiColor.copy(accents[from]).lerp(accents[from+1],mix);ringMaterial.color.copy(uiColor);
    document.body.style.setProperty('--accent',uiColor.getStyle());document.body.style.setProperty('--bg',scene.background.getStyle());
    updateCopy(current);canvas.dataset.progress=current.toFixed(4);canvas.dataset.loaded='roblox,uit,toolkit';canvas.dataset.toolLogos='7-vector-extrusions';
    renderer.render(scene,camera);if(!reduced())start();
  }
  motion.addEventListener('click',()=>{paused=!paused;updateMotion();});preference.addEventListener('change',updateMotion);
  addEventListener('scroll',updateTarget,{passive:true});addEventListener('resize',resize);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else{last=performance.now();start();}});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;cancelAnimationFrame(frame);frame=0;status.textContent='Đang khôi phục phần hiển thị 3D…';});
  canvas.addEventListener('webglcontextrestored',()=>{lost=false;status.textContent='';start();});
  document.body.classList.add('enhanced');status.textContent='';
  const initialChapter=sections.find(section=>'#'+section.id===location.hash);
  if(initialChapter) scrollTo({top:initialChapter.offsetTop,behavior:'instant'});
  resize();current=target;updateMotion();
} catch(error){renderer?.dispose();fallback(error);}
