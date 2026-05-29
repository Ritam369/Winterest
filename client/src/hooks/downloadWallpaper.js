const downloadWallpaper = async (wallpaper) => {
  try {
    const res = await fetch(wallpaper.url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `winterest-${wallpaper._id}.${wallpaper.format}`;
    a.click();
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(wallpaper.url, '_blank');
  }
};

export default downloadWallpaper;
