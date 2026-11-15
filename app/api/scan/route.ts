import { AppError, apiError, generate, readBody, sameOrigin } from '@/lib/gemini';
import { scanSchema } from '@/lib/schemas';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const type = request.headers.get('content-type') || '';
    if (!type.startsWith('multipart/form-data')) throw new AppError(400, 'Please upload a photo.');
    const bytes = await readBody(request, 3 * 1024 * 1024 + 65536);
    let form: FormData;
    try { form = await new Response(bytes, {headers: {'content-type': type}}).formData(); }
    catch { throw new AppError(400, 'The photo upload could not be read. Please choose the file again.'); }
    const photo = form.get('photo');
    if (!(photo instanceof File) || !photo.size || photo.size > 3 * 1024 * 1024) throw new AppError(400, 'Choose a non-empty photo under 3 MB.');
    const data = Buffer.from(await photo.arrayBuffer());
    const mime = data[0]===0xff && data[1]===0xd8 && data[2]===0xff ? 'image/jpeg'
      : data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png'
      : data.toString('ascii',0,4)==='RIFF' && data.toString('ascii',8,12)==='WEBP' ? 'image/webp' : '';
    if (!mime || mime !== photo.type) throw new AppError(400, 'The file must be a valid JPG, PNG, or WebP image.');
    const result = await generate(scanSchema, 'Identify only likely visible edible ingredients in this fridge or food photo. Use short ordinary English ingredient names. Category must be Produce, Dairy & eggs, Pantry, or Other (meat/fish in Other). Do not guess contents of closed containers, hidden items, or unreadable labels. Mark ambiguous visible foods uncertain and explain uncertainty in note. Do not treat brands as ingredients. If no foods are identifiable, return an empty list and explain in message. All detections will be reviewed by the user. Never assess freshness or safety from the photo.', {inlineData: {mimeType: mime, data: data.toString('base64')}});
    return Response.json(result);
  } catch(error) { return apiError(error); }
}
