grpNum = 0;
arrayJobIDs = [];
nowDays = Date.now() / 1000 | 0;
UID = 0;
$(function ()
{
    VK.init({
        apiId : 6064179
    });
    VK.Auth.getLoginStatus(function (a)
    {
        if (a.session) {
            $('#unauth').hide();
            UID = a.session.mid
        }
        else {
            doLogin()
        }
    });
    $('form[name="group"]').submit(getGroupInvolved);
    $('form[name="keyword"]').submit(getKeywordInvolved);
    $('form[name="post"]').submit(getPostInvolved);
    $('form[name="keyword_contacts"]').submit(getConstacts);
    $('form[name="person"]').submit(getPersonFriends);
    $('form[name="groupmembers"]').submit(getGroupMembers);
    $('form[name="Ngroupmembers"]').submit(getNGroupMembers);
    $("#tabs").tabs();
    $("#login").click(doLogin);
    $('#plusGroup').click(addGroup);
    $('#plusPerson').click(addPerson);
    $('#NplusGroup').click(addNGroup);
    $('#intersect').click(intersectResults);
    $('#concat').click(concatResults);
    $("#city").autocomplete(
    {
        source : function (d, e)
        {
            var f = $('#country').val();
            VK.Api.call('database.getCities', {
                'country_id' : f, 'q' : d.term, 'v' : '5.28', 'count' : 1000
            },
            function (c)
            {
                e($.map(c.response.items, function (a)
                {
                    var b = a.title + (a.region ? '(' + a.region + ')' : '');
                    return {
                        value : a.id, label : b
                    }
                }))
            })
        },
        minLength : 3,
        select : function (a, b)
        {
            addCity(b.item);
            $("#city").val("");
            a.preventDefault()
        },
        open : function ()
        {
            $(this).removeClass("ui-corner-all").addClass("ui-corner-top")
        },
        close : function ()
        {
            $(this).removeClass("ui-corner-top").addClass("ui-corner-all")
        },
        response : function (a, b) {}
    });
    scheduler = new myScheduler();
});
function getPostInvolved(f)
{
    try
    {
        resultIds = [];
        $('#progress').text();
        initCities();
        var a = $('#posturl').val(), filter = $('select[name="filter"]').val();
        var b = /.+(photo|wall)(-?\d+)_(\d+)/;
        var c = a.match(b);
        if (c.length !== 4) {
            throw ('Что-то не так с URL');
        }
        if (c[1] === 'wall') {
            c[1] = 'post'
        }
        resultName = 'post_' + c[2] + '_' + c[3] + '.csv';
        resultLegend = 'Лайки поста (' + c[2] + '_' + c[3] + ')';
        var d = {
            type : c[1], owner_id : c[2], item_id : c[3], filter : filter, offset : 0, v : '5.28'
        };
        scheduler.addJob(getPostLikes, d);
        scheduler.onDone = function ()
        {
            resultIds = arrayUnique(resultIds);
            jobIsDone()
        };
        scheduler.run()
    }
    catch (e) {
        console.log(e)
    }
    f.preventDefault();
    return false
}
function getPostLikes(d)
{
    var f = this.jobID;
    console.log("Running postLikes: " + d.owner_id + '_' + d.item_id + " offset: " + d.offset);
    try
    {
        VK.Api.call('execute.postLikesExt', d, function (c)
        {
            if (!c.error)
            {
                c.response.ids.forEach(function (i)
                {
                    var a = [];
                    if (typeof i === "object" && i.length)
                    {
                        var b = Object.keys(citiesFilter).length;
                        for (var j = 0; j < i.length; j++) {
                            if ((b && i[j].city && citiesFilter[i[j].city.id]) || !b) {
                                a.push(i[j].id)
                            }
                        }
                        resultIds = resultIds.concat(a);
                    }
                });
                if (c.response.continueAt !=- 1) {
                    d.offset = c.response.continueAt.toFixed();
                    scheduler.addJob(getPostLikes, d)
                }
            }
            else if (c.error.error_code == 6) {
                scheduler.addJob(getPostLikes, d)
            }
            else {
                console.log(c.error);
            }
            scheduler.deleteJob(f)
        })
    }
    catch (e) {
        console.log(e)
    }
}
function getGroupInvolved(f)
{
    try
    {
        resultIds = [];
        $('#progress').text();
        depth = $('#grdepth').val();
        initCities();
        var a = getGroupNames("groupQuery");
        resultName = 'groups_' + getGroupIdsFromNames(a, getInvolvedStep2).join('_') + '.csv';
        resultLegend = 'Лайки в группах (' + resultName + ')'
    }
    catch (e) {
        console.log(e)
    }
    f.preventDefault();
    return false
}
function getInvolvedStep2(a)
{
    if (a.length > 499) {
        var b = a.splice(499, 100000);
        scheduler.addJob(getInvolvedStep2, b)
    }
    resultIds = [];
    var c = parseInt(depth / 20) + (depth % 20 ? 1 : 0);
    for (var i = 0; i < a.length; i++) {
        for (var j = 0; j < c; j++) {
            scheduler.addJob(getGroupPostsLikes, a[i], j * 20)
        }
    }
    scheduler.onDone = function ()
    {
        $('#progress').text("Removing duplicated IDs. Please wait ...");
        resultIds = arrayUnique(resultIds);
        jobIsDone()
    };
    scheduler.onProgress = displayProgress;
    scheduler.run()
}
function getGroupPostsLikes(d, f)
{
    var g = this.jobID;
    console.log("Running job (Likes). Gid:" + d + ' off:' + f);
    var h = {
        groups : d, offset : f, now : nowDays, v : '5.28'
    };
    VK.Api.call('execute.grpLikesExt', h, function (c)
    {
        if (!(c.error || c.response === "Hello World"))
        {
            var t = resultIds.length;
            c.response.ids && c.response.ids.forEach(function (i)
            {
                var a = [];
                if (typeof i === "object" && i.count)
                {
                    var b = Object.keys(citiesFilter).length;
                    for (var j = 0; j < i.items.length; j++)
                    {
                        if ((b && i.items[j].city && citiesFilter[i.items[j].city.id]) || !b) {
                            a.push(i.items[j].id)
                        }
                    }
                    resultIds = resultIds.concat(a);
                }
            });
            c.response.popPosts && c.response.popPosts.forEach(function (e, i)
            {
                var a = e;
                var b = {
                    type : "post", owner_id : a.owner, item_id : a.postId, filter : "", offset : 1000, 
                    v : '5.28'
                };
                scheduler.addJob(getPostLikes, b)
            })
        }
        else
        {
            if (c.error.error_code == 6) {
                scheduler.addJob(getGroupPostsLikes, d, f)
            }
            else {
                console.log(c.error);
            }
        }
        scheduler.deleteJob(g)
    })
}
function getGroupPostsComments(b, c)
{
    var d = this.jobID;
    console.log("Running job (Comments). Gid:" + b + ' off:' + c);
    var e = {
        groups : b, offset : c, now : nowDays, v : '5.28'
    };
    VK.Api.call('execute.grp_commentsNew', e, function (a)
    {
        if (!(a.error))
        {
            var t = resultIds.length;
            a.response && a.response.forEach(function (i)
            {
                resultIds = resultIds.concat(i);
            })
        }
        else
        {
            if (a.error.error_code == 6) {
                scheduler.errorCount++;
                scheduler.addJob(getGroupPostsLikes, b, c)
            }
            else {
                console.log(a.error);
            }
        }
        scheduler.deleteJob(d)
    })
}
function getKeywordInvolved(f)
{
    try
    {
        resultIds = [];
        initCities();
        depth = $('#kwdepth').val();
        var a = $('#keywordquery').val();
        var b = 
        {
            sort : $('select[name="sort"]').val(), country_id : $('select[name="country"]').val(), count : $('input[name="count"]').val()
        };
        resultName = 'tags_' + searchGroupsByKeyword(a, b, getInvolvedStep2) + '.csv';
        resultLegend = 'Поиск по ключевому слову (' + a + ')'
    }
    catch (e) {
        console.log(e)
    }
    f.preventDefault();
    return false
}
function searchGroupsByKeyword(b, c, d)
{
    var e = this.jobID, context = this;
    var f = '';
    for (var g in c) {
        f += ', ' + g + ': ' + c[g]
    }
    var h = 'return API.groups.search({q: \"' + b + '\" ' + f + ' , v: 5.28}).items@.id;';
    VK.Api.call('execute', {
        code : h, v : '5.28'
    },
    function (a)
    {
        if (!(a.error || a.response === "Hello World")) {
            d.call(context, a.response)
        }
        else
        {
            scheduler.errorCount++;
            scheduler.addJob(searchGroupsByKeyword, b, c, d);
            console.log(a.error)
        }
    });
    return b
}
function getConstacts(f)
{
    try
    {
        resultIds = [];
        initCities();
        var a = $('#keyword_contact_query').val();
        var b = 
        {
            sort : $('select[name="keyword_contact_sort"]').val(), country_id : $('select[name="keyword_contact_country"]').val(), 
            count : $('input[name="keyword_contact_count"]').val()
        };
        resultName = 'tags_' + a + '.csv';
        resultLegend = 'Контакты групп (' + a + ')';
        if (Object.keys(citiesFilter).length)
        {
            Object.keys(citiesFilter).forEach(function (e, i)
            {
                var p = myCloneObj(b);
                p['city_id'] = e;
                scheduler.addJob(searchGroupsByKeyword, a, p, getContactsStep2)
            })
        }
        else {
            scheduler.addJob(searchGroupsByKeyword, a, b, getContactsStep2)
        }
        scheduler.onDone = function ()
        {
            resultIds = arrayUnique(resultIds);
            jobIsDone()
        };
        scheduler.onProgress = displayProgress;
        scheduler.run()
    }
    catch (e) {
        console.log(e)
    }
    f.preventDefault();
    return false
}
function getContactsStep2(b)
{
    if (b.length > 499) {
        var d = b.splice(499, 100000);
        scheduler.addJob(getContactsStep2, d)
    }
    var e = this.jobID;
    var f = 'return API.groups.getById({group_ids: "' + b.join(',') + '", fields: "contacts", v: 5.28})@.contacts;';
    VK.Api.call('execute', {
        code : f, v : '5.28'
    },
    function (a)
    {
        if (!a.error)
        {
            a.response.forEach(function (i)
            {
                if (i && typeof i.forEach === 'function')
                {
                    i.forEach(function (c)
                    {
                        if (c.hasOwnProperty("user_id")) {
                            resultIds.push(c.user_id);
                        }
                    })
                }
            })
        }
        else
        {
            if (a.error.error_code == 6) {
                scheduler.errorCount++;
                scheduler.addJob(getContactsStep2, b)
            }
            else {
                console.log(a.error)
            }
        }
        scheduler.deleteJob(e)
    })
}
function getPersonFriends(f)
{
    try
    {
        resultIds = [];
        var d = [];
        initCities();
        var g = /.*vk.com\/(.+)/;
        var h = $('input[name="person"]').map(function (a, b)
        {
            return b.value;
        }).toArray();
        h.forEach(function (a)
        {
            var b = a.match(g);
            if (b.length != 2) {
                throw ('malformed URL');
            }
            d.push(b[1])
        });
        resultName = 'friends_' + d.join('_') + '.csv';
        resultLegend = 'Друзья (' + d.join('_') + ')';
        var i = {
            user_ids : d.join(','), version : 5.28
        };
        VK.Api.call('users.get', i, function (b)
        {
            if (!b.error)
            {
                var c = b.response;
                c.length && c.forEach(function (a)
                {
                    scheduler.addJob(getFriendsOfID, a.uid, 0)
                });
                scheduler.onDone = function ()
                {
                    resultIds = arrayUnique(resultIds);
                    jobIsDone()
                };
                scheduler.onProgress = displayProgress;
                scheduler.run()
            }
        })
    }
    catch (e) {
        console.log(e)
    }
    f.preventDefault();
    return false
}
function getFriendsOfID(d, e)
{
    var f = this.jobID;
    var g = {
        user_id : d, count : 5000, offset : e, fields : 'city', version : 5.28
    };
    VK.Api.call('friends.get', g, function (b)
    {
        if (!b.error)
        {
            var c = b.response;
            if (c.length) {
                scheduler.addJob(getFriendsOfID, d, e + 5000);
            }
            c.forEach(function (i)
            {
                if (typeof i === "object")
                {
                    var a = Object.keys(citiesFilter).length;
                    if ((a && i.city && citiesFilter[i.city.id]) || !a) {
                        resultIds.push(i.uid)
                    }
                }
            })
        }
        scheduler.deleteJob(f)
    })
}
function getGroupMembers(f)
{
    try
    {
        resultIds = [];
        initCities();
        sex = parseInt($('select[name="group_sex_group"]').val());
        var d = $('input[name="unsure"]')[0].checked;
        var g = getGroupNames('groupName');
        resultName = 'groupmembers_' + g.join('_') + '.csv';
        resultLegend = 'Участники групп (' + g.join('_') + ')';
        var h = {
            group_ids : g.join(','), version : 5.28
        };
        VK.Api.call('groups.getById', h, function (b)
        {
            if (!b.error)
            {
                var c = b.response;
                c.length && c.forEach(function (a)
                {
                    scheduler.addJob(getGroupMembersFromID, true, a.gid, 0);
                    if (d) {
                        scheduler.addJob(getGroupMembersFromID, true, a.gid, 0, true)
                    }
                });
                scheduler.onDone = function ()
                {
                    resultIds = arrayUnique(resultIds);
                    jobIsDone()
                };
                scheduler.onProgress = displayProgress;
                scheduler.run()
            }
        })
    }
    catch (e) {
        console.log(e)
    }
    f.preventDefault();
    return false
}
function getGroupMembersFromID(d, e, f, g)
{
    g = g | false;
    var h = this.jobID;
    var j = {
        group_id : e, offset : f, 
    };
    if (g) {
        j.filter = 'unsure'
    }
    VK.Api.call('execute.grpMembers', j, function (b)
    {
        console.log("Got responce: GID:" + e + " offset: " + f);
        if (!b.error)
        {
            var c = b.response.users;
            if (d)
            {
                for (var i = 1; i * 25000 < b.response.count; i++)
                {
                    scheduler.addJob(getGroupMembersFromID, false, e, f + i * 25000);
                    if (g) {
                        scheduler.addJob(getGroupMembersFromID, false, e, f + i * 25000, true)
                    }
                }
            }
            c.forEach(function (i)
            {
                if (typeof i === "object")
                {
                    var a = Object.keys(citiesFilter).length;
                    if (((sex && sex == i.sex) || !sex) && ((a && i.city && citiesFilter[i.city]) || !a)) {
                        resultIds.push(i.id)
                    }
                }
            })
        }
        scheduler.deleteJob(h)
    })
}
function getNGroupMembers(f)
{
    try
    {
        resultIds = [];
        var b = [];
        initCities();
        sex = parseInt($('select[name="group_sexN"]').val());
        var c = $('input[name="unsureN"]')[0].checked;
        var N = parseInt($('#Nnum').val());
        var d = getGroupNames('groupNameN');
        resultName = 'N_groups_' + d.join('_') + '.csv';
        getGroupIdsFromNames(d, function (a)
        {
            resultLegend = 'N и более групп (' + a.join('_') + ')';
            for (var i = 0; i < a.length; i++) {
                scheduler.addJob(getGroupMembersFromID, true, a[i], 0)
            }
            scheduler.onDone = function ()
            {
                finishNGroups(N);
                jobIsDone()
            };
            scheduler.onProgress = displayProgress;
            scheduler.run()
        })
    }
    catch (e) {
        console.log(e)
    }
    f.preventDefault();
    return false
}
function finishNGroups(N)
{
    var a = {};
    var b = [];
    for (var i = 0; i < resultIds.length; i++) {
        var c = resultIds[i];
        if (!a[c]) {
            a[c] = 0;
        }
        if (++a[c] >= N) {
            b.push(c);
        }
    }
    delete resultIds;
    resultIds = b
}
function getGroupIdsFromNames(b, c)
{
    var d = this;
    var e = 'return API.groups.getById({group_ids: "' + b.join(',') + '", v: 5.28})@.id;';
    VK.Api.call('execute', {
        code : e, v : '5.28'
    },
    function (a)
    {
        if (!a.error) {
            c.call(d, a.response);
        }
        else {
            console.log(a.error);
        }
    });
    return b
}
function getGroupNames(e)
{
    var f = [];
    var g = /.*vk.com\/(.+)/;
    var h = /public|event(\d+)/;
    var i = $('textarea[name="' + e + '"]').val().split('\n').map(function (a, b)
    {
        return a;
    });
    i.forEach(function (a)
    {
        var b = a.match(g);
        if (b && b.length == 2) {
            var c = b[1].match(h);
            var d;
            if (c && c.length === 2) {
                d = 'club' + c[1];
            }
            else {
                d = b[1];
            }
            f.push(d)
        }
    });
    return f
}
function myScheduler()
{
    this.addJob = function ()
    {
        this.jobs.push(arguments);
        this.numberOfJobs++
    };
    this.deleteJob = function (a)
    {
        this.countJobsDone++;
        delete this.runningJobs[a]
    };
    this.run = function ()
    {
        if (this.onProgress && typeof this.onProgress === 'function')
        {
            this.onProgress()
        }
        var a = this.jobs.shift();
        var b = this;
        if (a && typeof a[0] === 'function')
        {
            this.waiting = 0;
            a = Array.prototype.slice.call(a);
            func = a.shift();
            var c = func.name + a.toString() + Date.now();
            this.runningJobs[c] = 1;
            func.apply({
                'jobID' : c
            }, a);
            setTimeout(function ()
            {
                b.run()
            }, 350)
        }
        else
        {
            if (Object.keys(b.runningJobs).length)
            {
                this.waiting++;
                if (this.waiting > 600) {
                    this.finish()
                }
                else {
                    setTimeout(function ()
                    {
                        b.run()
                    }, 350)
                }
            }
            else {
                this.finish()
            }
        }
    };
    this.finish = function ()
    {
        if (this.onDone && typeof this.onDone === 'function')
        {
            this.onDone()
        }
        this.init()
    };
    this.init = function ()
    {
        this.jobs = [];
        this.onDone = 0;
        this.onProgress = 0;
        this.numberOfJobs = 0;
        this.runningJobs = {};
        this.waiting = 0;
        this.countJobsDone = 0;
    };
    this.init()
}
function doLogin()
{
    VK.Auth.login(function (a)
    {
        if (a.session) {
            $('#unauth').hide();
            UID = a.session.mid;
        }
    }, 262144)
}
function jobIsDone()
{
    var a = arrayJobIDs.push(resultIds);
    a--;
    if (!resultLegend) {
        resultLegend = "";
    }
    var b = 'data:application/csv;charset=utf-8,' + encodeURIComponent(resultIds.join('\n\r'));
    $('body ol').append('<li><input name="result" type="checkbox" value="' + a + '"> <a href="' + b + '" target="_blank" download=' + resultName + '>Скачать результат: ' + resultLegend + ' ' + resultIds.length + ' штук.</a></li>');
    $('#progress').text('Задание выполнено');
    if (arrayJobIDs.length == 2) {
        $('#actionButtons').removeClass('hidden');
    }
    yaParams = {
        uid : UID, job : resultLegend, count : resultIds.length
    };
    if (window.yaCounter28512416) {
        yaCounter28512416.reachGoal('jobIsDone', yaParams);
    }
}
function displayProgress()
{
    var a = scheduler.countJobsDone / scheduler.numberOfJobs;
    var b = (100 * a).toFixed(2);
    if (b === "100.00") {
        b = '99.99';
    }
    $('#progress').text(b + '% выполнено')
}
function addCity(a)
{
    $('#cities').append('<tr><td><input type="hidden" name="cities" value="' + a.value + '"><span>' + a.label + ' </span></td><td><a href="#" class="delcity">Удалить</a></td></tr>');
    $('.delcity').click(function (e)
    {
        e.target.parentNode.parentNode.remove();
        e.preventDefault()
    })
}
function initCities()
{
    var a = $('input[name="cities"]').map(function (i, e)
    {
        return parseInt(e.value);
    });
    citiesFilter = {};
    a.each(function (i, e)
    {
        citiesFilter[e] = 1;
    })
}
function minusField()
{
    $(this).parent().parent().remove()
}
function addGroup()
{
    grpNum++;
    $(this).parent().parent().after('<tr>' + '<td><label for="groupquery' + grpNum + '">Группа</label></td>' + '<td><input id="groupquery' + grpNum + '" type="text" name="groupquery" /></div></td>' + '<td><span class="minus typo">-</span></td>' + '</tr>');
    $('.minus').click(minusField)
}
function addNGroup()
{
    grpNum++;
    $(this).parent().parent().after('<tr>' + '<td><label for="Ngroupquery' + grpNum + '">Группа</label></td>' + '<td><input id="Ngroupquery' + grpNum + '" type="text" name="NgroupName" /></div></td>' + '<td><span class="minus typo">-</span></td>' + '</tr>');
    $('.minus').click(minusField)
}
function addPerson()
{
    grpNum++;
    $(this).parent().parent().after('<tr>' + '<td><label for="person' + grpNum + '">Страница</label></td>' + '<td><input id="person' + grpNum + '" type="text" name="person" /></div></td>' + '<td><span class="minus typo">-</span></td>' + '</tr>');
    $('.minus').click(minusField)
}
function onlyUnique(a, b, c)
{
    return c.indexOf(a) === b
}
function arrayUnique(a)
{
    var b = {};
    for (var i = 0; i < a.length; i++) {
        b[a[i]] = 1
    }
    return Object.keys(b)
}
function arrayIntersection(a, b)
{
    var c = {};
    var d = b[0];
    for (var i = 1; i < b.length; i++) {
        var e = b[i];
        if (a[e].length < a[d].length) {
            d = e;
        }
    }
    for (var j = 0; j < a[d].length; j++) {
        var f = a[d][j];
        c[f] = 1
    }
    for (var i = 0; i < b.length; i++)
    {
        var g = {};
        if (i == d) {
            continue;
        }
        for (var j = 0; j < a[i].length; j++) {
            var f = a[i][j];
            if (c[f]) {
                g[f] = 1;
            }
        }
        c = g
    }
    return Object.keys(c)
}
function intersectResults()
{
    var a = $('input[name="result"]:checked').map(function (i, e)
    {
        return parseInt(e.value);
    });
    resultIds = arrayIntersection(arrayJobIDs, a);
    resultName = 'concat_' + a.toArray().join('_') + '.csv';
    resultLegend = 'Пересечение результатов (' + a.toArray().join('_') + ')';
    jobIsDone()
}
function concatResults()
{
    var a = $('input[name="result"]:checked').map(function (i, e)
    {
        return parseInt(e.value);
    });
    resultIds = [];
    a.each(function (i, e)
    {
        resultIds = resultIds.concat(arrayJobIDs[parseInt(e)]);
    });
    resultIds = arrayUnique(resultIds);
    resultName = 'concat_' + a.toArray().join('_') + '.csv';
    resultLegend = 'Объединение результатов (' + a.toArray().join('_') + ')';
    jobIsDone()
}
function myCloneObj(o)
{
    var a, obj = {};
    for (a in o) {
        if (o.hasOwnProperty(a)) {
            obj[a] = o[a];
        }
        return obj;
    }
};
