import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

// Generates logo-32.png, logo-192.png, logo-512.png and favicon.ico in public/
async function main(){
  const root = path.resolve(process.cwd());
  const publicDir = path.join(root, 'public');
  const svgPath = path.join(publicDir, 'logo.svg');

  if(!fs.existsSync(svgPath)){
    console.error('Missing public/logo.svg — cannot generate favicons');
    process.exit(2);
  }

  const sizes = [32, 192, 512];
  const outputs = [];

  for(const s of sizes){
    const outPath = path.join(publicDir, `logo-${s}.png`);
    console.log('Generating', outPath);
    await sharp(svgPath, { density: 300 })
      .resize(s, s, { fit: 'contain' })
      .png({ quality: 90 })
      .toFile(outPath);
    outputs.push(outPath);
  }

  // create favicon.ico from 32 and 16 variants (use 32 and 64 if available)
  try{
    const icoBuf = await pngToIco([path.join(publicDir, 'logo-32.png')]);
    const icoPath = path.join(publicDir, 'favicon.ico');
    fs.writeFileSync(icoPath, icoBuf);
    console.log('Wrote', icoPath);
  }catch(err){
    console.error('Failed to generate favicon.ico:', err);
  }

  console.log('Favicons generated:', outputs.join(', '));
}

main().catch(err=>{
  console.error(err);
  process.exit(1);
});
