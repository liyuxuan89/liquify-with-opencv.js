let canvas = document.getElementById("image-canvas")
let ctx = canvas.getContext('2d')
let canvas_test = document.getElementById("test-canvas")
let ctx_text = canvas_test.getContext('2d')

let imgMat
let scale
let pred_dx
let pred_dy
let pred_dw
let pred_dh
let liquifying
let radius
let distanceMat
let start_x, start_y

var img=new Image();	
img.src='./test.jpg';
img.onload=function(){
    //绘图
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var scale_x = canvas.width / img.width;
    var scale_y = canvas.height / img.height;
    scale = scale_x < scale_y ? scale_x : scale_y;
    pre_dx = (canvas.width - img.width * scale) / 2;
    pre_dy = (canvas.height - img.height * scale) / 2;
    pre_dw = img.width * scale;
    pre_dh = img.height * scale;
    ctx.drawImage(img, 0, 0, img.width, img.height, pre_dx, pre_dy, pre_dw, pre_dh);
    //初始化距离图
    radius = 50
    distanceMat = getDistanceMap(radius)
    imgMat = new cv.Mat()
    let src = cv.imread(img)
    cv.copyMakeBorder(src, imgMat, radius+1, radius+1, radius+1, radius+1, cv.BORDER_CONSTANT, new cv.Scalar(0, 0, 0, 255));
    src.delete()
}

canvas.addEventListener('mousedown', e=>{
    liquifying = true
    var {x, y} = getLocation(e.x, e.y);
    var {x_i, y_i} = toImageLocation(x, y);
    start_x = x_i
    start_y = y_i
})

canvas.addEventListener('mouseup', e=>{
    liquifying = false
    let width = radius * 2 + 1
    var {x, y} = getLocation(e.x, e.y);
    var {x_i, y_i} = toImageLocation(x, y);
    // calculation remaping
    let mat_x = new cv.Mat(width, width, cv.CV_32FC1)
    let mat_y = new cv.Mat(width, width, cv.CV_32FC1)
    let x_offset = x_i - start_x
    let y_offset = y_i - start_y

    for(let x = 0; x < width; x++) {
        for(let y = 0; y < width; y++) {
            let pixel_x = mat_x.floatPtr(y, x)
            let pixel_y = mat_y.floatPtr(y, x)
            let pixel = distanceMat.floatPtr(y, x)
            pixel_x[0] = x - x_offset * pixel[0]
            pixel_y[0] = y - y_offset * pixel[0]
        }
    }
    let rect = new cv.Rect(Math.ceil(start_x) - radius, Math.ceil(start_y) - radius, width, width)
    let roi = imgMat.roi(rect)
    let roiClone = roi.clone()
    cv.remap(roiClone, roi, mat_x, mat_y, cv.INTER_LINEAR, cv.BORDER_CONSTANT)
    mat_x.delete()
    mat_y.delete()
    roi.delete()
    roiClone.delete()
    
    rect = new cv.Rect(radius+1, radius+1, imgMat.cols-2*radius-2, imgMat.rows-2*radius-2)
    let center = imgMat.roi(rect).clone()
    let size = new cv.Size(pre_dw, pre_dh)
    cv.resize(center.clone(), center, size, 0, 0, cv.INTER_AREA)

    let imageData = ctx.createImageData(center.cols, center.rows);
    imageData.data.set(new Uint8ClampedArray(center.data, center.cols, center.rows));

    ctx.putImageData(imageData, pre_dx, pre_dy);
    console.log(x_offset, y_offset)
})

function getLocation(x, y){
    var bbox = canvas.getBoundingClientRect();
    return {
        x: (x - bbox.left) * (canvas.width / bbox.width),
        y: (y - bbox.top) * (canvas.height / bbox.height)
    };
}

function toImageLocation(x, y){
    return {
        x_i: (x - pre_dx) / scale + radius + 1,
        y_i: (y - pre_dy) / scale + radius + 1
    };
}

function getDistanceMap(radius) {
    let width = radius * 2 + 1
    let mat = new cv.Mat(width, width, cv.CV_32FC1)
    for(let x = 0; x < width; x++) {
        for(let y = 0; y < width; y++) {
            let pixel = mat.floatPtr(y, x)
            let dis = (x - radius)**2 + (y - radius)**2
            let ratio = 1 - (dis / (radius**2))
            if(ratio < 0) {
                ratio = 0
            }
            pixel[0] = ratio
        }
    }
    return mat
}
