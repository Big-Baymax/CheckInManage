// 用于实现深拷贝而使用的函数、无法转换function；
function cloneObj(obj){
    var str, newobj = obj.constructor === Array ? [] : {};
    if(typeof obj !== 'object'){
        return;
    } else if(window.JSON){
        str = JSON.stringify(obj), //系列化对象
            newobj = JSON.parse(str); //还原
    } else {
        for(var i in obj){
            newobj[i] = typeof obj[i] === 'object' ?
                cloneObj(obj[i]) : obj[i];
        }
    }
    return newobj;
}

function isContains(self, con) { // 判断数组中是否包含con这个内容
    var i = self.length;
    while ( i-- ) {
        if(self[i] == con) {
            return true;
        }
    }
    return false;
}

// 为讨论室和教室转换为数组
function maxToArr(max) {
    var maxToarr = [];
    for (var key in max) {
        for (var k in max[key]) {
            maxToarr.push(max[key][k]);
        }
    }
    return maxToarr;
}
// 将错误信息转换为字符串
function errorToString(msg) {
    var m = '';
    for (var key in msg) {
        m += (msg[key] + '\n');
    }
    return { flag: false, msg: m };
}

function sortList(obj) {
    var arr = [];
    for (var i in obj) {
        obj[i].id = i;
        arr.push(obj[i]);
    }
    var len = arr.length;
    for (var i = 0; i < len; i++) {
        for (var j = 0; j < len - 1 - i; j++) {
            if (arr[j].start_time > arr[j+1].start_time) {        //相邻元素两两对比
                var temp = arr[j+1];        //元素交换
                arr[j+1] = arr[j];
                arr[j] = temp;
            }
        }
    }
    return arr;
}

Format = function (time, fmt) { // 时间格式化
    var o = {
        "M+": time.getMonth() + 1,
        "d+": time.getDate(),
        "H+": time.getHours(),
        "m+": time.getMinutes(),
        "s+": time.getSeconds(),
        "q+": Math.floor((time.getMonth() + 3) / 3),
        "S": time.getMilliseconds()
    };
    var year = time.getFullYear();
    var yearstr = year + '';
    yearstr = yearstr.length >= 4 ? yearstr : '0000'.substr(0, 4 - yearstr.length) + yearstr;

    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (yearstr + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
};

module.exports.cloneObj = cloneObj;
module.exports.isContains = isContains;
module.exports.maxToArr = maxToArr;
module.exports.errorToString = errorToString; // 将错误信息转换为字符串
module.exports.sortList = sortList; //对导出数据进行排序
module.exports.Format = Format; // 对日期进行格式化