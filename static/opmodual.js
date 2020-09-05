Date.prototype.Format = function (fmt) { // 时间格式化
    var o = {
        "M+": this.getMonth() + 1,
        "d+": this.getDate(),
        "H+": this.getHours(),
        "m+": this.getMinutes(),
        "s+": this.getSeconds(),
        "q+": Math.floor((this.getMonth() + 3) / 3),
        "S": this.getMilliseconds()
    };
    var year = this.getFullYear();
    var yearstr = year + '';
    yearstr = yearstr.length >= 4 ? yearstr : '0000'.substr(0, 4 - yearstr.length) + yearstr;

    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (yearstr + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
};

var execDirPath = process.execPath.slice(0, -7);// 去除 \nw.exe
var s = opm = (function () { // 操作类 s 为别名，是一个引用
    var sqlite = require('./modules/sqlite')(execDirPath); // 数据库操作相关模块
    var exportExcel = require('./modules/exportExcel'); // 导出excel表格相关
    var tools = require('./modules/tools'); // 工具仓库
    var check = require('./modules/check'); // 检测是否可以安排

    var __config = {}; // 所有的配置对象

    getConifg();

    function getConifg() { // 获取项目的配置内容
        var configList = sqlite.db.exec("SELECT * FROM config"); // 获取所有的配置信息在内存中
        var config = {};
        for (var i = 0; i < configList[0]['values'].length; i++) {
            config[configList[0]['values'][i][1]] = configList[0]['values'][i][2];
        }
        if (config['classroom']) {
            config['classroom'] = JSON.parse(config['classroom']);
        }
        if (config['meeting']) {
            config['meeting'] = JSON.parse(config['meeting']);
        }
        __config = config;
        return config;
    }

    function _setConfig(configName, configValue) { // json传对象
        var skey = configName.toString();
        var svalue;
        if (typeof configValue == 'object') { // 教室类型存的是json对象，变更前先将其取出
            svalue = JSON.stringify(configValue);
        } else {
            svalue = configValue.toString();
        }

        var configKey = ['singly', 'double', 'classroom', 'meeting'];
        if (configKey.indexOf(skey) == -1) { // 不是三个中的一个就无法进行进行
            return false;
        }
        if (__config[skey]) {
            sqlite.db.run("update config set value = ? where key = ?", [svalue, skey]);
        } else {
            sqlite.db.run("insert into config values(null, ?, ?)", [skey, svalue]);
        }
        sqlite.save();
        getConifg(); // 为程序更新数据
        return true;
    }

    // 获取单位及其id
    function getUnitAndid(start_time, end_time) {
        start_time = start_time ? new Date(start_time) : new Date();
        if (end_time) {
            end_time = new Date(end_time)
        } else {
            var ssDate = new Date();
            ssDate.setFullYear(ssDate.getFullYear() + 10);
            end_time = ssDate;
        };
        start_time = start_time.Format('yyyy-MM-dd');
        end_time = end_time.Format('yyyy-MM-dd');
        var list = sqlite.selectPlanByPeriod(start_time, end_time);
        var r = [];
        for (var key in list) {
            r.push({
                id: key,
                unit: list[key].unit + ' (' + list[key].start_time + ' 至 ' + list[key].end_time + ')'
            });
        }
        return r;
    }

    function getAll(table) { // 获取表下的所有数据
        if (!table) {
            return {
                error: true,
                msg: '数据库表名未指定'
            }
        }
        try {
            var res = sqlite.db.exec("select * FROM '" + table + "'");
        } catch (err) {
            alert(err.toString());
        }

        return res;
    }

    // todo 修改配置
    function setConfig(obj) { // {singly: 10, double: 20, classroom: {}}
        var error = {};
        if (obj.singly) {
            error.singly = _setConfig('singly', obj.singly) ? '保存单间成功' : '保存单间失败';
        }
        if (obj.double) {
            error.double = _setConfig('double', obj.double) ? '保存单间成功' : '保存单间失败';
        }
        if (obj.classroom) {
            var classroom = obj.classroom.split(',');
            error.classroom = _setConfig('classroom', classroom) ? '保存教室成功' : '保存教室失败';
        }
        if (obj.meeting) {
            var meeting = obj.meeting.split(',');
            error.classroom = _setConfig('meeting', meeting) ? '保存讨论室成功' : '保存讨论室失败';
        }
        return error;
    }

    // unit 单位名称
    // total 总人数
    // singly 单间人数
    // double 标间人数
    // start_time 开始时间
    // end_time 结束时间
    function setPlan(unit, total, singly, double, start_time, end_time) { // 设置住宿
        if (!unit) {
            return {flag: false, msg: '单位不能为空'};
        }
        if (!total) {
            return {flag: false, msg: '总数不能为空'};
        }
        if (!start_time) {
            return {flag: false, msg: '开始时间不能为空'};
        }
        if (!end_time) {
            return {flag: false, msg: '结束时间不能为空'};
        }

        double = parseInt(double);
        singly = parseInt(singly);
        start_time = new Date(start_time).Format('yyyy-MM-dd'); // 格式化日期 2017-06-01 开始
        end_time = new Date(end_time).Format('yyyy-MM-dd'); // 格式化日期 2017-06-01

        var msg = {}; // 保存的错误信息
        var hasError = false; // 是否有错误

        // 获取对应时间段内的计划安排
        var planList = sqlite.selectPlanByPeriod(start_time, end_time);
        // 返回的是最大的住宿单间与标间，教师使用情况
        var max = check.haveHousing(planList, start_time, end_time);

        if (singly + max.singly > __config.singly) {
            hasError = true;
            msg.singly = '安排单间 ' + singly + ' 超过总数,\n\n时间段内已安排' + max.singly + '\n\n共 ' + __config.singly + ' 间';
        }
        if (double + max.double > __config.double) {
            hasError = true;
            msg.double = '安排标间 ' + double + ' 超过总数,\n\n时间段内已安排' + max.double + '\n\n共 ' + __config.double + ' 间';
        }
        if (hasError) {
            // msg = JSON.stringify(msg);
            var m = '';
            for (var key in msg) {
                m += (msg[key] + '\n');
            }
            return {
                flag: false,
                msg: m
            };
        }
        var planReault = sqlite.setPlan({ // true 成功 false 失败
            unit: unit,
            total: total,
            singly: singly,
            double: double,
            start_time: start_time,
            end_time: end_time
        });
        var msg = planReault ? '录入信息成功' : '录入信息失败';
        return {
            flag: planReault,
            msg: msg
        }
    }

    function setPlanClassroom(belong_id, room, time_flag, start_time, end_time) {
        // 格式化参数
        belong_id = parseInt(belong_id);
        time_flag = parseInt(time_flag);
        end_time = end_time == '0000-00-00' ? start_time :end_time;
        start_time = new Date(start_time).Format('yyyy-MM-dd');
        end_time = new Date(end_time).Format('yyyy-MM-dd');
        var belong = sqlite.getPlanById(belong_id);
        try {
            check.checkClassroom(belong_id, room, time_flag, start_time, end_time, belong.start_time, belong.end_time);
        } catch (err) {
            return {flag: false, msg: err.message};
        }
        if (start_time != end_time) {
            time_flag = 0;
        }
        var msg = {}; // 保存的错误信息
        var hasError = false; // 是否有错误`
        room = room ? room : '';
        var planList = sqlite.selectPlanClassroomByPeriod(start_time, end_time);
        // belong_id room start_time end_time time_flag
        var max = check.haveClassroom(planList, start_time, end_time); // 返回的是已经使用的教室
        var maxToarr = tools.maxToArr(max);
        if (tools.isContains(maxToarr, room)) {
            hasError = true;
            msg.room = '教室 ' + room + '已经被安排';
        }
        if (hasError) { return tools.errorToString(msg); }
        try {
            var planReault = sqlite.setPlanClassroom({ // true 成功 false 失败
                belong_id: belong_id,
                room: room,
                time_flag: time_flag,
                start_time: start_time,
                end_time: end_time
            });
        } catch ( err ) {
            alert(err.toString());
        }
        msg = planReault ? '录入信息成功' : '录入信息失败';
        return { flag: planReault, msg: msg }
    }

    // 设置讨论室
    function setPlanMeeting(belong_id, content, time_flag, start_time, end_time) {
        // 格式化参数
        belong_id = parseInt(belong_id);
        end_time = end_time == '0000-00-00' ? start_time :end_time;
        start_time = new Date(start_time).Format('yyyy-MM-dd');
        end_time = new Date(end_time).Format('yyyy-MM-dd');
        time_flag = parseInt(time_flag); // 1 早上 2 下午 3 晚上
        var belong = sqlite.getPlanById(belong_id);
        try {
            check.checkMeeting(belong_id, content, time_flag, start_time, end_time, belong.start_time, belong.end_time);
        } catch ( err ) {
            return {flag: false, msg: err.message};
        }
        if (start_time != end_time) {
            time_flag = 0;
        }
        var msg = {}; // 保存的错误信息
        var hasError = false; // 是否有错误
        content = content ? content : [];
        var planList = sqlite.selectPlanMeetingByPeriod(start_time, end_time);
        var meet = check.haveMeeting(planList, start_time, end_time);
        var meetToArr = tools.maxToArr(meet);
        msg.meet = '讨论室';
        for (var k in content) {
            if (tools.isContains(meetToArr, content[k])) {
                hasError = true;
                msg.meet += (content[k] + ', ')
            }
        }
        msg.meet += '已经被占用！';
        if (hasError) {
            var m = '';
            for (var key in msg) {
                m += (msg[key] + '\n');
            }
            return {flag: false, msg: m};
        }

        content = JSON.stringify(content);
        var planReault = sqlite.setPlanMeeting({ // true 成功 false 失败
            belong_id: belong_id,
            content: content,
            time_flag: time_flag,
            start_time: start_time,
            end_time: end_time
        });
        msg = planReault ? '录入信息成功' : '录入信息失败';
        return {flag: planReault, msg: msg}
    }

    // 从开始时间到所有的记录
    function getInfoPlan(start_time, end_time) {
        start_time = start_time ? new Date(start_time) : new Date();
        if (end_time) {
            end_time = new Date(end_time)
        } else {
            var ssDate = new Date();
            ssDate.setFullYear(ssDate.getFullYear() + 10);
            end_time = ssDate;
        }

        start_time = start_time.Format('yyyy-MM-dd');
        end_time = end_time.Format('yyyy-MM-dd');
        var housing = sqlite.selectPlanByPeriod(start_time, end_time);
        var classroom = sqlite.selectPlanClassroomByPeriod(start_time, end_time);
        var meeting = sqlite.selectPlanMeetingByPeriod(start_time, end_time);

        var result = {};
        for (var key in housing) {
            result[key] = housing[key];
            result[key].classroom = [];
            result[key].meeting = [];
            for (var k in classroom) {
                if (classroom[k].belong_id == key) {
                    result[key].classroom.push(classroom[k]);
                }
            }
            for (var k in meeting) {
                if (meeting[k].belong_id == key) {
                    result[key].meeting.push(meeting[k]);
                }
            }
        }
        return result;
    }

    function getHousing(start_time, end_time) {
        start_time = start_time ? new Date(start_time) : new Date();
        if (end_time) {
            end_time = new Date(end_time)
        } else {
            var ssDate = new Date();
            ssDate.setFullYear(ssDate.getFullYear() + 10);
            end_time = ssDate;
        }

        start_time = start_time.Format('yyyy-MM-dd');
        end_time = end_time.Format('yyyy-MM-dd');
        var result = sqlite.selectPlanByPeriod(start_time, end_time);
        var max = check.haveHousing(result, start_time, end_time);
        return {
            singly: __config.singly - max.singly,
            double: __config.double - max.double,
            room: max.room,
            result: result
        };
    }

    // 从开始时间到所有的内容
    function getClassroomByTime(time) {
        time = time ? new Date(time) : new Date();
        time = time.Format('yyyy-MM-dd');
        var unitId = sqlite.selectPlan();
        var result = sqlite.selectPlanClassroomByTime(time);
        for (var key in result) {
            result[key].unit = unitId[result[key].belong_id].unit;
        }
        var max = check.haveClassroom(result, time, time);
        var empty = {
            '1': [],
            '2': [],
            '3': []
        };
        for (var key in __config.classroom) {
            if (!tools.isContains(max['1'], __config.classroom[key])) {
                empty['1'].push(__config.classroom[key]);
            }
            if (!tools.isContains(max['2'], __config.classroom[key])) {
                empty['2'].push(__config.classroom[key]);
            }
            if (!tools.isContains(max['3'], __config.classroom[key])) {
                empty['3'].push(__config.classroom[key]);
            }
        }
        return {
            used: max,
            empty: empty,
            result: result
        };
    }

    function getClassroomByPeriod(start_time, end_time) {
        start_time = start_time ? new Date(start_time) : new Date();
        if (end_time) {
            end_time = new Date(end_time)
        } else {
            var ssDate = new Date();
            ssDate.setFullYear(ssDate.getFullYear() + 10);
            end_time = ssDate;
        }
        start_time = start_time.Format('yyyy-MM-dd');
        end_time = end_time.Format('yyyy-MM-dd');
        var unitId = sqlite.selectPlan();
        var result = sqlite.selectPlanClassroomByPeriod(start_time, end_time);
        for (var key in result) {
            result[key]['unit'] = unitId[result[key].belong_id] ? unitId[result[key].belong_id].unit : '';
        }
        var max = check.haveClassroom(result, start_time, end_time);
        var empty = {
            '1': [],
            '2': [],
            '3': []
        };
        for (var key in __config.classroom) {
            if (!tools.isContains(max['1'], __config.classroom[key])) {
                empty['1'].push(__config.classroom[key]);
            }
            if (!tools.isContains(max['2'], __config.classroom[key])) {
                empty['2'].push(__config.classroom[key]);
            }
            if (!tools.isContains(max['3'], __config.classroom[key])) {
                empty['3'].push(__config.classroom[key]);
            }
        }
        return {
            used: max,
            empty: empty,
            result: result
        };
    }

    // 从开始时间到所有的内容
    function getMeetingByTime(time) {
        time = time ? new Date(time) : new Date();
        time = time.Format('yyyy-MM-dd');
        var unitId = sqlite.selectPlan();
        var result = sqlite.selectPlanMeetingByTime(time);
        for (var key in result) {
            result[key].unit = unitId[result[key].belong_id] ? unitId[result[key].belong_id].unit : '';
        }
        var max = check.haveMeeting(result, time, time);
        var empty = {
            '1': [],
            '2': [],
            '3': []
        };
        for (var key in __config.meeting) {
            if (!tools.isContains(max[1], __config.meeting[key])) {
                empty['1'].push(__config.meeting[key]);
            }
            if (!tools.isContains(max[2], __config.meeting[key])) {
                empty['2'].push(__config.meeting[key]);
            }
            if (!tools.isContains(max[3], __config.meeting[key])) {
                empty['3'].push(__config.meeting[key]);
            }
        }
        return {
            used: max,
            empty: empty,
            result: result
        };
    }

    function getMeetingByPeriod(start_time, end_time) {
        start_time = start_time ? new Date(start_time) : new Date();
        if (end_time) {
            end_time = new Date(end_time)
        } else {
            var ssDate = new Date();
            ssDate.setFullYear(ssDate.getFullYear() + 10);
            end_time = ssDate;
        }
        start_time = start_time.Format('yyyy-MM-dd');
        end_time = end_time.Format('yyyy-MM-dd');
        var unitId = sqlite.selectPlan();
        var result = sqlite.selectPlanMeetingByPeriod(start_time, end_time);
        for (var key in result) {
            result[key].unit = unitId[result[key].belong_id] ? unitId[result[key].belong_id].unit : '';
        }
        var max = check.haveMeeting(result, start_time, end_time);
        var empty = {
            '1': [],
            '2': [],
            '3': []
        };
        for (var key in __config.meeting) {
            if (!tools.isContains(max['1'], __config.meeting[key])) {
                empty['1'].push(__config.meeting[key]);
            }
            if (!tools.isContains(max['2'], __config.meeting[key])) {
                empty['2'].push(__config.meeting[key]);
            }
            if (!tools.isContains(max['3'], __config.meeting[key])) {
                empty['3'].push(__config.meeting[key]);
            }
        }
        return {
            used: max,
            empty: empty,
            result: result
        }
    }

    // 更新记录
    function updatePlan(unit, total, singly, double, start_time, end_time, id) {
        if (!unit) {
            return {flag: false, msg: '单位不能为空'};
        }
        if (!total) {
            return {flag: false, msg: '总数不能为空'};
        }
        if (!start_time) {
            return {flag: false, msg: '开始时间不能为空'};
        }
        if (!end_time) {
            return {flag: false, msg: '结束时间不能为空'};
        }
        double = parseInt(double);
        singly = parseInt(singly);
        start_time = new Date(start_time).Format('yyyy-MM-dd'); // 格式化日期 2017-06-01 开始
        end_time = new Date(end_time).Format('yyyy-MM-dd'); // 格式化日期 2017-06-01

        var msg = {}; // 保存的错误信息
        var hasError = false; // 是否有错误

        // 获取对应时间段内的计划安排
        var planList = sqlite.selectPlanByPeriod(start_time, end_time);

        delete planList[id + ''];//删除对应的id值  避免被判断
        // 返回的是最大的住宿单间与标间，教师使用情况
        var max = check.haveHousing(planList, start_time, end_time);
        if (singly + max.singly > __config.singly) {
            hasError = true;
            msg.singly = '安排单间 ' + singly + ' 超过总数,\n\n时间段内已安排' + max.singly + '\n\n共 ' + __config.singly + ' 间';
        }
        if (double + max.double > __config.double) {
            hasError = true;
            msg.double = '安排标间 ' + double + ' 超过总数,\n\n时间段内已安排' + max.double + '\n\n共 ' + __config.double + ' 间';
        }
        if (hasError) {
            // msg = JSON.stringify(msg);
            var m = '';
            for (var key in msg) {
                m += (msg[key] + '\n');
            }
            return { flag: false, msg: m };
        }
        try {
            var planReault = sqlite.updatePlan({ // true 成功 false 失败
                unit: unit,
                total: total,
                singly: singly,
                double: double,
                start_time: start_time,
                end_time: end_time,
            }, id);
        } catch (err) {
            alert(err.toString());
        }
        var msg = planReault ? '修改信息成功' : '修改信息失败';
        return { flag: planReault, msg: msg }
    }

    // 更新教室安排记录
    function updatePlanClassroom(belong_id, room, time_flag, start_time, end_time, id) {
        // console.log('updatePlanClassroom arguments', arguments);
        console.log('start_time', start_time);
        console.log('end_time', end_time);
        // 格式化参数
        belong_id = parseInt(belong_id);
        end_time = end_time == '0000-00-00' ? start_time :end_time;
        start_time = new Date(start_time).Format('yyyy-MM-dd');
        end_time = new Date(end_time).Format('yyyy-MM-dd');
        var belong = sqlite.getPlanById(belong_id);
        try {
            check.checkClassroom(belong_id, room, time_flag, start_time, end_time, belong.start_time, belong.end_time);
        } catch (err) {
            return {flag: false, msg: err.message};
        }
        if (start_time != end_time) {
            time_flag = 0;
        }
        var msg = {}; // 保存的错误信息
        var hasError = false; // 是否有错误`
        room = room ? room : '';
        var planList = sqlite.selectPlanClassroomByPeriod(start_time, end_time);
        delete planList[id + ''];//删除对应的id值  避免被判断
        // belong_id room start_time end_time time_flag
        var max = check.haveClassroom(planList, start_time, end_time); // 返回的是已经使用的教室
        var maxToarr = tools.maxToArr(max);
        if (tools.isContains(maxToarr, room)) {
            hasError = true;
            msg.room = '教室 ' + room + '已经被安排';
        }
        if (hasError) { return tools.errorToString(msg); }
        try {
            var planReault = sqlite.updatePlanClassroom({ // true 成功 false 失败
                belong_id: belong_id,
                room: room,
                time_flag: time_flag,
                start_time: start_time,
                end_time: end_time
            }, id);
        } catch (err) {
            alert(err.toString());
        }
        msg = planReault ? '修改信息成功' : '修改信息失败';
        return { flag: planReault, msg: msg }
    }

    function updatePlanMeeting(belong_id, content, time_flag, start_time, end_time, id) {
        console.log('updatePlanMeeting', arguments);
        // 格式化参数
        belong_id = parseInt(belong_id);
        end_time = end_time == '0000-00-00' ? start_time :end_time;
        start_time = new Date(start_time).Format('yyyy-MM-dd');
        end_time = new Date(end_time).Format('yyyy-MM-dd');
        time_flag = parseInt(time_flag); // 1 早上 2 下午 3 晚上
        var belong = sqlite.getPlanById(belong_id);
        try {
            check.checkMeeting(belong_id, content, time_flag, start_time, end_time, belong.start_time, belong.end_time);
        } catch ( err ) {
            return {flag: false, msg: err.message};
        }
        if (start_time != end_time) {
            time_flag = 0;
        }
        var msg = {}; // 保存的错误信息
        var hasError = false; // 是否有错误
        content = content ? content : [];
        var planList = sqlite.selectPlanMeetingByPeriod(start_time, end_time);
        delete planList[id + '']; // 将当前记录从对象中删除，避免影响下方的判断
        var meet = check.haveMeeting(planList, start_time, end_time);
        var meetToArr = tools.maxToArr(meet);
        msg.meet = '讨论室';
        for (var k in content) {
            if (tools.isContains(meetToArr, content[k])) {
                hasError = true;
                msg.meet += (content[k] + ', ')
            }
        }
        msg.meet += '已经被占用！';
        if (hasError) {
            var m = '';
            for (var key in msg) {
                m += (msg[key] + '\n');
            }
            return {flag: false, msg: m};
        }
        content = JSON.stringify(content);
        var planReault = sqlite.updatePlanMeeting({ // true 成功 false 失败
            belong_id: belong_id,
            content: content,
            time_flag: time_flag,
            start_time: start_time,
            end_time: end_time
        }, id);
        msg = planReault ? '更新信息成功' : '更新信息失败';
        return {flag: planReault, msg: msg};
    }

    function restore(fileName) {
        sqlite.restore(fileName, getConifg);
    }

    function exportPlanToExcelOfAll (filenameAndPath) {
        var list = sqlite.selectPlan();
        list = tools.sortList(list);
        return exportExcel.exportToExcel(filenameAndPath, list);
    }
    function exportPlanToExcel (filenameAndPath, start_time, end_time) {
        start_time = start_time ? new Date(start_time) : new Date();
        if (end_time) {
            end_time = new Date(end_time)
        } else {
            var ssDate = new Date();
            ssDate.setFullYear(ssDate.getFullYear() + 10);
            end_time = ssDate;
        };
        start_time = start_time.Format('yyyy-MM-dd');
        end_time = end_time.Format('yyyy-MM-dd');
        var list = tools.sortList(sqlite.selectPlanByPeriod(start_time, end_time));
        return exportExcel.exportToExcel(filenameAndPath, list);
    }

    function exportClassroomToExcelOfAll (filenameAndPath) {
        var list = sqlite.selectPlanClassroom();
        var unitId = sqlite.selectPlan();
        for (var key in list) {
            list[key].unit = unitId[list[key].belong_id] ? unitId[list[key].belong_id].unit : '';
        }
        list = tools.sortList(list);
        return exportExcel.exportClassroomToExcel(filenameAndPath, list);
    }
    function exportClassroomToExcel (filenameAndPath, start_time, end_time) {
        start_time = start_time ? new Date(start_time) : new Date();
        if (end_time) {
            end_time = new Date(end_time)
        } else {
            var ssDate = new Date();
            ssDate.setFullYear(ssDate.getFullYear() + 10);
            end_time = ssDate;
        };
        start_time = start_time.Format('yyyy-MM-dd');
        end_time = end_time.Format('yyyy-MM-dd');
        var list = sqlite.selectPlanClassroomByPeriod(start_time, end_time);
        var unitId = sqlite.selectPlan();
        for (var key in list) {
            list[key].unit = unitId[list[key].belong_id] ? unitId[list[key].belong_id].unit : '';
        }
        list = tools.sortList(list);
        return exportExcel.exportClassroomToExcel(filenameAndPath, list);
    }

    function exportMeetingToExcelOfAll(filenameAndPath) {
        var list = sqlite.selectPlanMeeting();
        var unitId = sqlite.selectPlan();
        for (var key in list) {
            list[key].unit = unitId[list[key].belong_id] ? unitId[list[key].belong_id].unit : '';
        }
        list = tools.sortList(list);
        return exportExcel.exportMeetingToExcel(filenameAndPath, list);
    }
    function exportMeetingToExcel(filenameAndPath, start_time, end_time) {
        start_time = start_time ? new Date(start_time) : new Date();
        if (end_time) {
            end_time = new Date(end_time)
        } else {
            var ssDate = new Date();
            ssDate.setFullYear(ssDate.getFullYear() + 10);
            end_time = ssDate;
        };
        start_time = start_time.Format('yyyy-MM-dd');
        end_time = end_time.Format('yyyy-MM-dd');
        var list = sqlite.selectPlanMeetingByPeriod(start_time, end_time);
        var unitId = sqlite.selectPlan();
        for (var key in list) {
            list[key].unit = unitId[list[key].belong_id] ? unitId[list[key].belong_id].unit : '';
        }
        list = tools.sortList(list);
        return exportExcel.exportMeetingToExcel(filenameAndPath, list);
    }


    return {
        getAll: getAll, // 查询表 需要输入表名

        setConfig: setConfig, // 项目配置
        getConifg: getConifg, // 获取全部项目设置

        getUnitAndid: getUnitAndid, // 获取单位及其id

        setPlan: setPlan, // 设置入住安排
        setPlanClassroom: setPlanClassroom, // 设置教室安排
        setPlanMeeting: setPlanMeeting, // 设置讨论室安排
        updatePlan: updatePlan, // 更新数据
        updatePlanClassroom: updatePlanClassroom, // 更新教室安排记录
        updatePlanMeeting: updatePlanMeeting, // 更新讨论室安排

        getInfoPlan: getInfoPlan, // 获取全部信息 讨论室与教室安排也是根据时间来获取
        getHousing: getHousing,
        getClassroomByTime: getClassroomByTime, //
        getClassroomByPeriod: getClassroomByPeriod, //
        getMeetingByTime: getMeetingByTime, //
        getMeetingByPeriod: getMeetingByPeriod, // todo

        delPlan: sqlite.delPlan, // 删除一条住宿记录，传入id
        delPlanMeeting: sqlite.delPlanMeeting, // 删除一条讨论室安排记录，传入id
        delPlanClassroom: sqlite.delPlanClassroom, // 删除一条教室安排，传入id
        delOverduePlan: sqlite.delOverduePlan, // 删除过期的记录

        exportPlanToExcel: exportPlanToExcel, // 导出excel表格
        exportPlanToExcelOfAll: exportPlanToExcelOfAll, // 导出excel表格  全部内容

        exportClassroomToExcelOfAll: exportClassroomToExcelOfAll,
        exportClassroomToExcel: exportClassroomToExcel,

        exportMeetingToExcel: exportMeetingToExcel,
        exportMeetingToExcelOfAll: exportMeetingToExcelOfAll,

        backup: sqlite.backup, // 备份文件，文件按时间戳进行
        getBackup: sqlite.getBackup, //获取备份文件列表
        delBackup: sqlite.delBackup, //删除备份文件，需传入文件名  2017-10-13_1507855193224_databaseT.db
        restore: restore // 恢复备份，需要传入一个文件名
    };
}());

// console.log(opm.setPlan('单位名称5', 22, 30, 30, '2017-11-18', '2017-11-28'));
// console.log(opm.updatePlan('单位名称222', 22, 30, 30, '2017-10-18', '2017-11-28', 83));
// console.log(opm.delPlan(81));


// console.log(opm.setPlanClassroom(85, '第四教室', 0, '2017-10-18', '2017-10-18'));
// setPlanClassroom(belong_id, room, time_flag, start_time, end_time)

// console.log(opm.updatePlanClassroom(85, '第六教室', 2, '2017-11-18', '2017-11-19', 31));
// console.log(opm.delPlanClassroom(32));

// console.log(opm.setPlanMeeting(85, ["第8讨论室","第9讨论室","第10讨论室"], 3, '2017-11-22', '2017-11-22'));
// console.log(opm.updatePlanMeeting(85, ["第8讨论室"], 1, '2017-11-21', '2017-11-22', 6));

// console.log(opm.delPlanMeeting(1));

// console.log('getHousing', opm.getHousing());
// console.log('getClassroomByTime', opm.getClassroomByTime('2017-10-15'));
// console.log('getClassroomByperiod', opm.getClassroomByPeriod('2017-10-01', '2017-12-01'));
// console.log('getClassroomByperiod', opm.getClassroomByPeriod());
// console.log('getMeetingByTime', opm.getMeetingByTime());
// console.log('getMeetingByPeriod', opm.getMeetingByPeriod());

// console.log(opm.getInfoPlan());

// console.log(opm.getClassroom('2017-10-18'));
// console.log(opm.getMeeting('2017-10-21'));

// console.log('getBackup', opm.getBackup());
// console.log('delBackup', opm.delBackup('2017-10-13_1507855193224_databaseT.db'));

// opm.exportPlanToExcel('D:\\11.xlsx', '2017-10-27', '2017-12-20'); // 导出excel表格
// opm.exportPlanToExcelOfAll('D:\\12.xlsx'); // 导出excel表格  全部内容
// opm.exportClassroomToExcelOfAll('D:\\21.xlsx', '2017-10-10', '2017-12-20');
// opm.exportClassroomToExcel('D:\\22.xlsx');
// opm.exportMeetingToExcel('D:\\31.xlsx', '2017-10-10', '2017-12-20');
// opm.exportMeetingToExcelOfAll('D:\\32.xlsx');