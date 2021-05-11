let canvas = document.getElementById("image-canvas")
let ctx = canvas.getContext('2d')

let imgMat
let scale
let pred_dx
let pred_dy
let pred_dw
let pred_dh
let radius = 300
let liquifying = false
// let distanceMat
let start_x, start_y
let width = radius * 2 + 1
let mat_x = new cv.Mat(width, width, cv.CV_32FC1)
let mat_y = new cv.Mat(width, width, cv.CV_32FC1)
let mat_one = cv.Mat.ones(width, width, cv.CV_32FC1)
let mat_zero = cv.Mat.zeros(width, width, cv.CV_32FC1)

var img=new Image();	
img.src='./model.jpg';
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
    // getDistanceMap(radius)
    for(let x = 0; x < width; x++) {
        for(let y = 0; y < width; y++) {
            let pixel_x = mat_x.floatPtr(y, x)
            let pixel_y = mat_y.floatPtr(y, x)
            pixel_x[0] = x
            pixel_y[0] = y
        }
    }
    imgMat = new cv.Mat()
    let src = cv.imread(img)
    cv.copyMakeBorder(src, imgMat, radius+1, radius+1, radius+1, radius+1, cv.BORDER_REPLICATE, new cv.Scalar(0, 0, 0, 255));
    src.delete()
    console.log('load complete')
}

canvas.addEventListener('mousedown', e=>{
    liquifying = true
    var {x, y} = getLocation(e.x, e.y);
    var {x_i, y_i} = toImageLocation(x, y);
    start_x = x_i
    start_y = y_i
})


canvas.addEventListener('mouseup', e=>{
    liquifying = true
    var begin=new Date();
    var {x, y} = getLocation(e.x, e.y);
    var {x_i, y_i} = toImageLocation(x, y);
    // calculating remaping
    let x_offset = x_i - start_x
    let y_offset = y_i - start_y
    let dis = Math.sqrt(x_offset**2 + y_offset**2)
    if(dis >= radius * 0.3){
        x_offset = x_offset / dis * radius * 0.3
        y_offset = y_offset / dis * radius * 0.3
    }
    let dis_x = new cv.Mat()
    let dis_y = new cv.Mat()
    cv.addWeighted(mat_x, 1, mat_one, -radius, 0, dis_x)
    cv.addWeighted(mat_y, 1, mat_one, -radius, 0, dis_y)
    let ratio = new cv.Mat()
    cv.addWeighted(dis_x.mul(dis_x, 1), 1, dis_y.mul(dis_y, 1), 1, 0, ratio)
    cv.divide(ratio, mat_one, ratio, 1/radius**2)
    cv.addWeighted(mat_one, 1, ratio, -1, 0, ratio)
    cv.max(ratio, mat_zero, ratio)
    let map_x = new cv.Mat()
    let map_y = new cv.Mat()
    cv.subtract(mat_x, ratio.mul(mat_one, x_offset), map_x)
    cv.subtract(mat_y, ratio.mul(mat_one, y_offset), map_y)

    let rect = new cv.Rect(Math.ceil(start_x) - radius, Math.ceil(start_y) - radius, width, width)
    let roi = imgMat.roi(rect)
    cv.remap(roi, roi, map_x, map_y, cv.INTER_LINEAR, cv.BORDER_CONSTANT)
    roi.delete()
    dis_x.delete()
    dis_y.delete()
    map_x.delete()
    map_y.delete()
    ratio.delete()


    rect = new cv.Rect(radius+1, radius+1, imgMat.cols-2*radius-2, imgMat.rows-2*radius-2)
    let center = imgMat.roi(rect)
    let size = new cv.Size(pre_dw, pre_dh)
    cv.resize(center, center, size, 0, 0, cv.INTER_AREA)
    let imageData = ctx.createImageData(center.cols, center.rows);
    imageData.data.set(new Uint8ClampedArray(center.data, center.cols, center.rows));
    ctx.putImageData(imageData, pre_dx, pre_dy);
    center.delete()
    var end=new Date();
    var time=end-begin;
    console.log("time is="+time);
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
