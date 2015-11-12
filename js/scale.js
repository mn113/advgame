var origin = '0 0'
var scale = 'scale(2)';
document.body.style.webkitTransformOrigin = origin;
document.body.style.webkitTransform =  scale;    // Chrome, Opera, Safari
document.body.style.msTransform =   scale;       // IE 9
document.body.style.transform = scale;     // General