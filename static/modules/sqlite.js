/*
 * 数据库操作相关
 * 读取-备份
 */
var fs = require('fs'); // 读取文件操作
var SQL = require('./sql'); // sql操作模块
// var moment = require('moment'); // 日期处理插件

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

var db;
var execDirPath;

function readFileList(path, filesList) { // 读取文件列表
    var files = fs.readdirSync(path);
    files.forEach(function (itm, index) {
        var stat = fs.statSync(path + itm);
        if (stat.isDirectory()) {
            //递归读取文件
            readFileList(path + itm + "/", filesList)
        } else {
            var obj = {};//定义一个对象存放文件的路径和名字
            obj.path = path;//路径
            obj.filename = itm//名字
            filesList.push(obj);
        }
    })
}

function backup() { //将文件进行备份，并打上时间戳
    var binaryArray = db.export();
    var buffer = new Buffer(binaryArray);
    var filename = new Date().Format('yyyy-MM-dd');
    var ext = new Date().getTime();
    fs.writeFileSync(execDirPath + "/backup/" + filename + "_" + ext + "_databaseT.db", buffer);
    return true;
}

function delBackup(filename) {
    // filename 2017-10-13_1507855193224_databaseT.db
    try {
        fs.unlink(execDirPath + "/backup/" + filename, function () {
            return true;
        });
    } catch (e) {
        alert(e.toString());
        return false;
    }
}

function getBackup() { // 获取备份信息
    var filesList = []; // 文件列表
    var result = {}; // 整理后方便输出的对象
    try {
        readFileList(execDirPath + "/backup/", filesList)
    } catch (err) {
        alert(err.toString())
    }
    for (var key = 0; key < filesList.length; key++) {
        var tempArr = filesList[key].filename.split('_');
        var time = new Date(parseInt(tempArr[1]));
        result[key] = {
            time: time,
            filename: filesList[key].filename
        };
    }
    return result;
}

// 恢复备份
function restore(fileName, getConifg) {
    var backupfilebuffer;// 备份文件
    var filesList = [];
    readFileList(execDirPath + "/backup/", filesList);
    for (var key = 0; key < filesList.length; key++) {
        if (filesList[key].filename = fileName) {
            backupfilebuffer = fs.readFileSync(filesList[key].path + filesList[key].filename); // Load the db 加载数据库
            fs.writeFileSync(execDirPath + "/databaseT.db", backupfilebuffer);
            var filebuffer = fs.readFileSync(execDirPath + '/databaseT.db'); // Load the db 加载数据库
            db = new SQL.Database(filebuffer);
            getConifg();
            return true;
        }
    }
    return false;
}

function save() { //为数据库进行保存到本地的操作，在进行数据库修改时进行调用，未来添加备份功能
    var binaryArray = db.export();
    var buffer = new Buffer(binaryArray);
    try {
        fs.writeFileSync(execDirPath + "/databaseT.db", buffer);
    } catch (err) {
        alert(err.toString());
    }
}

// 选择一定时期内的计划数据
function selectPlanByPeriod(start_time, end_time) { // 获取一段时间内的住房的所有记录
    // alert(start_time);
    // alert(end_time);
    console.log(start_time);
    var stmt = db.prepare(
        "SELECT * FROM plan_housing WHERE (" +
        "(date($start_time) <= date(start_time) AND date(start_time) <= date($end_time))" +
        "OR (date($start_time) <= date(end_time) AND date(end_time) <= date($end_time))" +
        "OR (date($start_time) <= date(start_time) AND date(end_time) <= date($end_time))" +
        "OR (date($start_time) >= date(start_time) AND date(end_time) >= date($end_time))" +
        ") ORDER BY start_time desc");
    var result = {};
    stmt.bind({
        '$start_time': start_time,
        '$end_time': end_time
    });
    while (stmt.step()) { // 获取每一行的数据
        var row = stmt.getAsObject();
        result[row.id] = {
            unit: row.unit,
            singly: row.singly,
            double: row.double,
            start_time: row.start_time,
            end_time: row.end_time,
            total: row.total
        }
    }
    return result;
}

function selectPlan() { // 获取一段时间内的住房的所有记录
    var stmt = db.prepare("SELECT * FROM plan_housing");
    var result = {};
    stmt.bind({});
    while (stmt.step()) { // 获取每一行的数据
        var row = stmt.getAsObject();
        result[row.id] = {
            unit: row.unit,
            singly: row.singly,
            double: row.double,
            start_time: row.start_time,
            end_time: row.end_time,
            total: row.total
        }
    }
    return result;
}

function selectPlanClassroom() {
    var stmt = db.prepare(
        "SELECT * FROM plan_classroom"
    );
    var result = {};
    stmt.bind({});
    while (stmt.step()) { // 获取每一行的数据
        var row = stmt.getAsObject();
        result[row.id] = {
            belong_id: row.belong_id,
            room: row.room,
            time_flag: row.time_flag,
            start_time: row.start_time,
            end_time: row.end_time
        }
    }
    return result;
}

// 选择一定时期内的教室安排数据
function selectPlanClassroomByPeriod(start_time, end_time) { // 获取一段时间内的住房的所有记录
    var stmt = db.prepare(
        "SELECT * FROM plan_classroom WHERE (" +
        "(date($start_time) <= date(start_time) AND date(start_time) <= date($end_time))" +
        "OR (date($start_time) <= date(end_time) AND date(end_time) <= date($end_time))" +
        "OR (date($start_time) <= date(start_time) AND date(end_time) <= date($end_time))" +
        "OR (date($start_time) >= date(start_time) AND date(end_time) >= date($end_time))" +
        ") ORDER BY start_time");
    var result = {};
    stmt.bind({
        '$start_time': start_time,
        '$end_time': end_time
    });

    while (stmt.step()) { // 获取每一行的数据
        var row = stmt.getAsObject();
        result[row.id] = {
            belong_id: row.belong_id,
            room: row.room,
            start_time: row.start_time,
            end_time: row.end_time,
            time_flag: row.time_flag

        }
    }
    return result;
}

// 选择一定时期内的教室安排数据
function selectPlanClassroomByTime(time, time_flag) { // 获取一段时间内的住房的所有记录
    var sqlstr = time_flag
        ? "SELECT * FROM plan_classroom WHERE (date(start_time) <= date($time) and date(end_time) >= date($time)) AND ($time_flag == time_flag) ORDER BY start_time"
        : "SELECT * FROM plan_classroom WHERE date(start_time) <= date($time) and date(end_time) >= date($time) ORDER BY start_time";
    var stmt = db.prepare(sqlstr);
    var result = {};
    if (time_flag) {
        stmt.bind({
            '$time': time,
            '$time_flag': time_flag
        });
    } else {
        stmt.bind({'$time': time});
    }
    while (stmt.step()) { // 获取每一行的数据
        var row = stmt.getAsObject();
        result[row.id] = {
            belong_id: row.belong_id,
            room: row.room,
            time_flag: row.time_flag,
            start_time: row.start_time,
            end_time: row.end_time
        }
    }
    return result;
}

function selectPlanMeeting() {
    var sqlstr = "SELECT * FROM plan_meeting";
    var stmt = this.db.prepare(sqlstr);
    var result = {};
    stmt.bind({});
    while (stmt.step()) { // 获取每一行的数据
        var row = stmt.getAsObject();
        result[row.id] = {
            belong_id: row.belong_id,
            content: row.content,
            time_flag: row.time_flag,
            start_time: row.start_time,
            end_time: row.end_time
        }
    }
    return result;
}

// 选择一定时期内的讨论室安排
function selectPlanMeetingByTime(time, time_flag) {
    var sqlstr = time_flag
        ? "SELECT * FROM plan_meeting WHERE (date($time) == date(time)) AND ($time_flag == time_flag) ORDER BY start_time"
        : "SELECT * FROM plan_meeting WHERE date(start_time) <= date($time) and date(end_time) >= date($time) ORDER BY start_time";
    var stmt = this.db.prepare(sqlstr);
    var result = {};
    if (time_flag) {
        stmt.bind({
            '$time': time,
            '$time_flag': time_flag
        });
    } else {
        stmt.bind({'$time': time});
    }
    while (stmt.step()) { // 获取每一行的数据
        var row = stmt.getAsObject();
        result[row.id] = {
            belong_id: row.belong_id,
            content: row.content,
            time_flag: row.time_flag,
            start_time: row.start_time,
            end_time: row.end_time
        }
    }
    return result;
}

function selectPlanMeetingByPeriod(start_time, end_time) {
    var stmt = db.prepare(
        "SELECT * FROM plan_meeting WHERE (" +
        "(date($start_time) <= date(start_time) AND date(start_time) <= date($end_time))" +
        "OR (date($start_time) <= date(end_time) AND date(end_time) <= date($end_time))" +
        "OR (date($start_time) <= date(start_time) AND date(end_time) <= date($end_time))" +
        "OR (date($start_time) >= date(start_time) AND date(end_time) >= date($end_time))" +
        ") ORDER BY start_time");
    var result = {};
    stmt.bind({
        '$start_time': start_time,
        '$end_time': end_time
    });
    while (stmt.step()) {
        var row = stmt.getAsObject();
        result[row.id] = {
            belong_id: row.belong_id,
            content: row.content,
            time_flag: row.time_flag,
            start_time: row.start_time,
            end_time: row.end_time
        }
    }
    return result;
}

// 设置安排
function setPlan(obj) {
    db.run("insert into plan_housing values(null, ?, ?, ?, ?, ?, ?)",
        [obj.unit, obj.total, obj.singly, obj.double, obj.start_time, obj.end_time]);
    save();
    return true
}

// 设置教室安排
function setPlanClassroom(obj) {
    db.run("insert into plan_classroom values(null, ?, ?, ?, ?, ?)",
        [obj.belong_id, obj.room, obj.start_time, obj.end_time, obj.time_flag]);
    save();
    return true
}

// 设置讨论室安排
function setPlanMeeting(obj) {
    db.run("insert into plan_meeting values(null, ?, ?, ?, ?, ?)",
        [obj.belong_id, obj.content, obj.start_time, obj.end_time, obj.time_flag]);
    save();
    return true
}

// 更新安排
function updatePlan(obj, id) {
    db.run("update plan_housing set unit = ?, total = ?, singly = ?, double = ?, start_time = ?, end_time = ? " +
        "where id == ?", [obj.unit, obj.total, obj.singly, obj.double, obj.start_time, obj.end_time, id]);
    save();
    return true;
}

// 更新教室安排
function updatePlanClassroom(obj, id) {
    db.run("update plan_classroom set belong_id = ?, room = ?, time_flag = ?, start_time = ?, end_time = ? where id == ?",
        [obj.belong_id, obj.room, obj.time_flag, obj.start_time, obj.end_time, id]);
    save();
    return true;
}

// 更新讨论室安排
function updatePlanMeeting(obj, id) {
    db.run("update plan_meeting set belong_id = ?, content = ?, start_time = ?, end_time = ?, time_flag = ? where id == ?",
        [obj.belong_id, obj.content, obj.start_time, obj.end_time, obj.time_flag, id]);
    save();
    return true;
}

function delPlan(id) { // 删除宿舍记录
    if (!id) {
        return {
            flag: false,
            msg: '请输入入住记录的id号'
        }
    }
    try {
        db.run("delete from plan_housing where id = ?", [id]);
        db.run("delete from plan_meeting where belong_id = ?", [id]);
        db.run("delete from plan_classroom where belong_id = ?", [id]);
    } catch (e) {
        alert(e.toString());
    }
    save();
    return {
        flag: true,
        msg: '删除记录成功'
    }
}

function delPlanMeeting(id) {
    if (!id) {
        return {flag: false, msg: '请输入入住记录的id号'}
    }
    try {
        db.run("delete from plan_meeting where id = ?", [id]);
    } catch (e) {
        alert(e.toString());
    }
    save();
    return {flag: true, msg: '删除记录成功'}
}

function delPlanClassroom(id) {
    if (!id) {
        return {flag: false, msg: '请输入入住记录的id号'}
    }
    try {
        db.run("delete from plan_classroom where id = ?", [id]);
    } catch (e) {
        alert(e.toString());
    }
    save();
    return {flag: true, msg: '删除记录成功'}
}


// @2018/01/15
// 删除过期项目
function delOverduePlan(time) {
    time = time || new Date().Format('yyyy-MM-dd');
    backup(); // 先进行数据库的保存工作
    try {
        db.run("delete FROM plan_housing WHERE date(end_time) < date(?)", [time]);
        db.run("delete FROM plan_classroom WHERE date(end_time) < date(?)", [time]);
        db.run("delete FROM plan_meeting WHERE date(end_time) < date(?)", [time]);
    } catch (e) {
        alert(e.toString());
        console.log(e);
    }
    save();
    return {flag: true, msg: time}
}

function getPlanById(id) {
    var stmt = this.db.prepare(
        "SELECT * FROM plan_housing WHERE id = $id"
    );
    var result = {};
    stmt.bind({'$id': id});
    while (stmt.step()) { // 获取每一行的数据
        var row = stmt.getAsObject();
        result = {
            unit: row.unit,
            total: row.total,
            singly: row.singly,
            double: row.double,
            start_time: row.start_time,
            end_time: row.end_time
        }
    }
    return result;
}

function start(edp) {
    execDirPath = edp;
    var filebuffer = fs.readFileSync(execDirPath + '/databaseT.db'); // Load the db 加载数据库
    db = new SQL.Database(filebuffer);
    return {
        /*
            数据库文件操作相关
         */
        restore: restore,
        getBackup: getBackup,
        backup: backup,
        delBackup: delBackup,
        save: save,

        /*
            操作计划相关
         */
        setPlan: setPlan, //设置住宿计划
        setPlanClassroom: setPlanClassroom, // 设置教室计划
        setPlanMeeting: setPlanMeeting, //设置讨论室计划
        updatePlan: updatePlan, // 更新住宿计划
        updatePlanClassroom: updatePlanClassroom, // 更新教室计划
        updatePlanMeeting: updatePlanMeeting, // 更新讨论室计划
        delPlan: delPlan, // 删除计划
        delPlanMeeting: delPlanMeeting,
        delPlanClassroom: delPlanClassroom,

        delOverduePlan: delOverduePlan, // 删除过期项目
        /*
            选择计划相关
         */
        selectPlanByPeriod: selectPlanByPeriod,
        selectPlanClassroomByPeriod: selectPlanClassroomByPeriod,
        selectPlanClassroomByTime: selectPlanClassroomByTime,
        selectPlanClassroom: selectPlanClassroom,
        selectPlanMeetingByPeriod: selectPlanMeetingByPeriod,
        selectPlanMeetingByTime: selectPlanMeetingByTime,
        selectPlanMeeting: selectPlanMeeting,

        getPlanById: getPlanById,
        selectPlan: selectPlan, //获取所有的计划数据
        db: db
    }
}

module.exports = start;