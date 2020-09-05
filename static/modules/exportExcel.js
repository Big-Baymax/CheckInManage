/*
 * excel表格的导出
 */
var nodeExcel = require('excel-export');
var fs = require('fs'); // 读取文件操作
var tools = require('./tools'); // 工具

// 导出住宿安排
function exportToExcel(filenameAndPath, ls) {
    var conf ={};
    conf.stylesXmlFile = "styles.xml";
    conf.name = "sheets1";
    conf.cols = [{
        caption:'编号',//名称
        type:'number' // 类型 bool number data
    },{
        caption:'单位名称',
        type:'string'
    },{
        caption:'入住时间(开始)',
        beforeCellWrite:function(row, cellData, eOpt){
            if (cellData == '0000-00-00') {
                return '';
            }
            return cellData.substring(5);
        },
        type:'string'
    },{
        caption:'入住时间(结束)',
        beforeCellWrite:function(row, cellData, eOpt){
            if (cellData == '0000-00-00') {
                return '';
            }
            return cellData.substring(5);
        },
        type:'string'
    },{
        caption:'总人数',
        type:'number'
    },{
        caption:'单间',
        type:'number'
    },{
        caption:'标间',
        type:'number'
    }];
    conf.rows = [];
    for (var id in ls) {
        conf.rows.push([ls[id].id, ls[id].unit, ls[id].start_time, ls[id].end_time, ls[id].total, ls[id].singly, ls[id].double]);
    }
    var result;
    try {
        result = nodeExcel.execute(conf);
    } catch (err) {
        return { flag: false, msg: err.toString()};
    }
    try {
        fs.writeFileSync(filenameAndPath, result, 'binary');
        return { flag: true, msg: '操作成功' };
    } catch (e) {
        return {flag: false,msg: e.toString()};
    }
}

// 导出教室安排
function exportClassroomToExcel(filenameAndPath, ls) {
    var conf ={};
    conf.stylesXmlFile = "styles.xml";
    conf.name = "sheets1";
    conf.cols = [{
        caption:'编号',//名称
        type:'number' // 类型 bool number data
    },{
        caption:'所属单位编号',//名称
        type:'number' // 类型 bool number data
    },{
        caption:'单位名称',
        type:'string'
    },{
        caption:'使用教室',
        type:'string'
    },{
        caption:'教室使用时间(开始)',
        beforeCellWrite:function(row, cellData, eOpt){
            if (cellData == '0000-00-00') {
                return '';
            }
            return cellData.substring(5);
        },
        type:'string'
    },{
        caption:'教室使用时间(结束)',
        beforeCellWrite:function(row, cellData, eOpt){
            if (cellData == '0000-00-00') {
                return '';
            }
            return cellData.substring(5);
        },
        type:'string'
    },{
        caption:'讨论室使用时间段',
        beforeCellWrite:function(row, cellData, eOpt){
            var res = '';
            switch (cellData) {
                case 0:
                    res = '全天';
                    break;
                case 1:
                    res = '上午';
                    break;
                case 2:
                    res = '下午';
                    break;
                case 3:
                    res = '晚上';
                    break;
                default:
                    res = '';
            }
            return res;
        },
        type:'string'
    }];
    conf.rows = [];
    for (var id in ls) {
        conf.rows.push([ls[id].id, ls[id].belong_id, ls[id].unit, ls[id].room, ls[id].start_time, ls[id].end_time, ls[id].time_flag]);
    }
    var result;
    try {
        result = nodeExcel.execute(conf);
    } catch (err) {
        return {flag: false, msg: err.toString()};
    }
    try {
        fs.writeFileSync(filenameAndPath, result, 'binary');
        return { flag: true, msg: '操作成功' }
    } catch (e) {
        // e.toString();
        return { flag: false, msg: e.toString()};
    }
}

function exportMeetingToExcel(filenameAndPath, ls) {
    var conf ={};
    conf.stylesXmlFile = "styles.xml";
    conf.name = "sheets1";
    conf.cols = [{
        caption:'编号',//名称
        type:'number' // 类型 bool number data
    },{
        caption:'所属单位编号',
        type:'number'
    },{
        caption:'单位名称',
        type:'string'
    },{
        caption:'使用讨论室',
        type:'string'
    },{
        caption:'讨论室使用时间(开始)',
        beforeCellWrite:function(row, cellData, eOpt){
            if (cellData == '0000-00-00') {
                return '';
            }
            return cellData.substring(5);
        },
        type:'string'
    },{
        caption:'讨论室使用时间(结束)',
        beforeCellWrite:function(row, cellData, eOpt){
            if (cellData == '0000-00-00') {
                return '';
            }
            return cellData.substring(5);
        },
        type:'string'
    },{
        caption:'使用时间段',
        beforeCellWrite:function(row, cellData, eOpt){
            var res = '';
            switch (cellData) {
                case 0:
                    res = '全天';
                    break;
                case 1:
                    res = '上午';
                    break;
                case 2:
                    res = '下午';
                    break;
                case 3:
                    res = '晚上';
                    break;
                default:
                    res = '';
            }
            return res;
        },
        type:'string'
    }];
    conf.rows = [];
    for (var id in ls) {
        conf.rows.push(
            [ls[id].id, ls[id].belong_id, ls[id].unit, ls[id].content, ls[id].start_time, ls[id].end_time, ls[id].time_flag]
        );
    }
    var result;
    try {
        result = nodeExcel.execute(conf);
    } catch (err) {
        return { flag: false, msg: err.toString() }
    }
    try {
        fs.writeFileSync(filenameAndPath, result, 'binary');
        return { flag: true, msg: '操作成功'}
    } catch (e) {
        return { flag: false, msg: e.toString()}
    }
}

module.exports.exportToExcel = exportToExcel;

module.exports.exportClassroomToExcel = exportClassroomToExcel;

module.exports.exportMeetingToExcel = exportMeetingToExcel;
