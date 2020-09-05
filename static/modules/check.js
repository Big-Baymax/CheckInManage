var tools = require('./tools'); // 工具仓库
var error = require('./error'); // 抛出异常使用

// dd 需要添加的时间，dadd添加的天数
function addDate(dd,dadd){
    var a = new Date(dd);
    a = a.valueOf();
    a = a + dadd * 24 * 60 * 60 * 1000;
    a = new Date(a);
    return a;
}

// 检测是否有可入住的房间（单间，标间）
// 返回时间段内的最大单间，最大标间
function haveHousing(planList, start_time, end_time) {
    var temp_time = new Date(start_time); // 用来设置扫到的时间，从开始到结束
    end_time = new Date(end_time); // 结束时间
    var max_singly = 0;
    var max_double = 0;

    while(temp_time <= end_time) {
        var singly = 0;
        var double = 0;
        for (var key in planList) {
            var sT = new Date(planList[key].start_time);
            var eT = new Date(planList[key].end_time);
            if (sT <= temp_time && temp_time <= eT) { //安排在时间段内
                singly += planList[key].singly;
                double += planList[key].double;
            }
        }
        max_singly = singly > max_singly ? singly : max_singly;
        max_double = double > max_double ? double : max_double;
        temp_time = addDate(temp_time, 1); // 将时间往后推迟一天
    }
    return {
        singly: max_singly,
        double: max_double
    }
}

// 查看时间内是否有重复安排的讨论室
function haveMeeting(planList, start_time, end_time) {

    var temp_time = new Date(start_time); // 用来设置扫到的时间，从开始到结束
    end_time = new Date(end_time); // 结束时间
    var result = {
        '1': [],
        '2': [],
        '3': []
    };
    while(temp_time <= end_time) {
        for (var key in planList) {
            var sT = new Date(planList[key].start_time);
            var eT = new Date(planList[key].end_time);
            if (sT <= temp_time && temp_time <= eT) { //安排在时间段内
                // 使用讨论室的合集
                var arr = planList[key].content ? JSON.parse(planList[key].content) : false;
                if (arr) {
                    for (var k in arr) {
                        if (planList[key].time_flag === 0) { // 0 代表全天
                            _addToResult(result[1], arr[k]);
                            _addToResult(result[2], arr[k]);
                            _addToResult(result[3], arr[k]);
                        } else {
                            _addToResult(result[planList[key].time_flag], arr[k]);
                        }
                    }
                }
            }
        }
        temp_time = addDate(temp_time, 1); // 将时间往后推迟一天
    }
    return result;
}
/*
    查看是否有教室安排
    planList 教室安排列表
    config   教室配置
    meet     需要检查的讨论室
*/
function haveClassroom(planList, start_time, end_time) {
    var temp_time = new Date(start_time); // 用来设置扫到的时间，从开始到结束
    end_time = new Date(end_time); // 结束时间
    var result = {
        '1': [],
        '2': [],
        '3': []
    };
    while(temp_time <= end_time) {
        for (var key in planList) {
            var sT = new Date(planList[key].start_time);
            var eT = new Date(planList[key].end_time);
            if (sT <= temp_time && temp_time <= eT) { //安排在时间段内
                if (planList[key].time_flag == 0) { // 0 代表全天
                    _addToResult(result[1], planList[key].room);
                    _addToResult(result[2], planList[key].room);
                    _addToResult(result[3], planList[key].room);
                } else {
                    _addToResult(result[planList[key].time_flag], planList[key].room);
                }
            }
        }
        temp_time = addDate(temp_time, 1); // 将时间往后推迟一天
    }
    return result;
}

function _addToResult(result, content) {
    if (!tools.isContains(result, content)) { //已经包含在结果中
        result.push(content);
    }
    return true;
}

// 检测参数是否正确
function checkClassroom(belong_id, room, time_flag, start_time, end_time, belongStartTime, belongEndTime) {
    if (!belong_id) {
        throw new error.CommonException('所属单位安排不能为空', 1);
    }
    if (!room) {
        throw new error.CommonException('教室安排不能为空', 2);
    }
    // if (time_flag != 0 || time_flag != 1 || time_flag != 2 || time_flag != 3) {
    //     throw new error.CommonException('安排时间段不能为空', 3);
    // }
    if (!start_time) {
        throw new error.CommonException('开始时间不能为空', 4);
    }
    // if (!end_time) {
    //     throw new error.CommonException('结束时间不能为空', 5);
    // }
    if (belongStartTime > start_time || start_time > belongEndTime ||
        belongStartTime > end_time || end_time > belongEndTime) {
        throw new error.CommonException('设置教室的时间必须在住宿时间内', 6);
    }
}

function checkMeeting(belong_id, content, time_flag, start_time, end_time, belongStartTime, belongEndTime) {
    if (!belong_id) {
        throw new error.CommonException('所属单位安排不能为空', 1);
    }
    if (!content) {
        throw new error.CommonException('讨论室安排不能为空', 2);
    }
    // if (time_flag != 0 || time_flag != 1 || time_flag != 2 || time_flag != 3) {
    //     throw new error.CommonException('安排时间段不能为空', 3);
    // }
    if (!start_time) {
        throw new error.CommonException('开始时间不能为空', 4);
    }
    // if (!end_time) {
    //     throw new error.CommonException('结束时间不能为空', 5);
    // }
    if (belongStartTime > start_time || start_time > belongEndTime ||
        belongStartTime > end_time || end_time > belongEndTime) {
        throw new error.CommonException('设置讨论室的时间必须在住宿时间内', 6);
    }
}



module.exports = {
    haveHousing: haveHousing,
    haveMeeting: haveMeeting,
    haveClassroom: haveClassroom,

    checkClassroom: checkClassroom,
    checkMeeting: checkMeeting
};

