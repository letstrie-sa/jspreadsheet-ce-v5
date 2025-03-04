export const setZoom = function (scale) {
  const obj = this;
  if (scale >= 0.5 && scale <= 3) {
    obj.content.style.zoom = scale;
  }
};

export const getZoom = function () {
  const obj = this;
  const zoomLevel = obj.content.style.zoom;
  return zoomLevel ? parseFloat(zoomLevel) : 1;
};
