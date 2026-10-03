const infoPageImagePaths = [
  "affiliate/commission-photo.jpg",
  "affiliate/lifetime-returning-customer.jpg",
  "affiliate/creators.jpg",
  "vials-c/bpc-157-4a596acd979f.webp",
  "vials-c/nad-48d0c75f913c.webp",
  "shipping/shipping-warehouse.jpg",
  "shipping/shipping-worldwide.jpg",
  "shipping/shipping-express.jpg",
  "shipping/shipping-community-reference.jpg",
  "shipping/shipping-order-bonus-lab.jpg",
  "vials-c/kpv-3bda87926280.webp",
  "vials-c/mots-c-ead676f909ff.webp",
  "vials-c/dsip-0f74d3cf1e6a.webp",
];

const imageLoads = new Map();

function loadImage(src) {
  const existingLoad = imageLoads.get(src);
  if (existingLoad) return existingLoad;

  const load = new Promise((resolve, reject) => {
    const image = new Image();
    let settled = false;

    const fail = () => {
      if (settled) return;
      settled = true;
      reject(new Error(`Could not load page image: ${src}`));
    };

    const finish = async () => {
      if (settled) return;
      if (!image.naturalWidth) {
        fail();
        return;
      }

      settled = true;
      try {
        await image.decode?.();
      } catch {
        // The browser has the downloaded image and can decode it when rendered.
      }
      resolve(image);
    };

    image.decoding = "async";
    image.onload = finish;
    image.onerror = fail;
    image.src = src;

    if (image.complete) {
      if (image.naturalWidth) void finish();
      else fail();
    }
  });

  const cachedLoad = load.catch((error) => {
    imageLoads.delete(src);
    throw error;
  });
  imageLoads.set(src, cachedLoad);
  return cachedLoad;
}

export function preloadInfoPageImages() {
  const baseUrl = import.meta.env.BASE_URL;
  return Promise.all(
    infoPageImagePaths.map((path) => loadImage(`${baseUrl}${path}`)),
  );
}