(function($) {
    $.fn.serializeObject = function() {
        "use strict";
        var result = {};
        var extend = function(i, element) {
            var node = result[element.name];
            if ('undefined' !== typeof node && node !== null) {
                if ($.isArray(node)) {
                    node.push(element.value);
                } else {
                    result[element.name] = [node, element.value];
                }
            } else {
                result[element.name] = element.value;
            }
        };

        $.each(this.serializeArray(), extend);
        return result;
    };
})(jQuery);

function FormatDate (strTime) {
    console.log(strTime)
    if (strTime.year == "" || strTime.year == undefined || strTime.year == null){
        return '0000-00-00';
    }else{
        return strTime.year+"-"+strTime.month+"-"+strTime.date;
    }

}
function Datetoshow (strTime) {
    var date = new Date(strTime);
    return date.getFullYear()+"年"+(date.getMonth()+1)+"月"+date.getDate()+"日";
}

function addoption(json,obj) {
    var html ='<option value="" style="display: none">--请点击选择你要安排的单位--</option>';
    for (var i =0;i < json.length;i++){
        html += '<option value="'+json[i].id+'">'+json[i].unit+'</option>';
    }
    obj.html(html);
}

function comoption(json,obj,flag) {
    if (flag){
        var html ='<option value="" style="display: none">--请点击选择--</option>';
    }else{
        var html ='<option value="">--按住Ctrl可以多选，也可以取消选择--</option>';
    }

    for (var i =0;i < json.length;i++){
        html += '<option value="'+json[i]+'">'+json[i]+'</option>';
    }
    obj.html(html);
}

function format_flag(flag){
    flag = parseInt(flag);
    switch (flag)
    {
        case 0:return "全天";break;
        case 1:return "上午";break;
        case 2:return "下午"; break;
        case 3:return "晚上";break;
        default:return "未设定";break;
    }
}
