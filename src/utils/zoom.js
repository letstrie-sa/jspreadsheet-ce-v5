export const setZoom = function(scale) {
    const obj = this;
    obj.content.style.zoom = scale;
}

export const getZoom = function() {
    const obj = this;
    const zoomLevel = obj.content.style.zoom
    return zoomLevel? parseFloat(zoomLevel) : 1;
}