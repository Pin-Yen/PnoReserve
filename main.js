function updateTime() {
  var nowDate = new Date();
  var d = nowDate.getDay();
  var dayNames = new Array("星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六");
  $('#time').text(nowDate.toLocaleString() + '(' + dayNames[d] + ')');
  setTimeout('updateTime()', 1000);
}

$('#time').ready(function() {
  updateTime();
});

// Firebase data.
var database = firebase.database();

var weekArray = new Array('sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat');

var account;
var loginDate = null;

var room = null;

// Datebase listener;
var listener = null;
var listenTo = '';

// Login
$('#ln-btn-login').click(function() {
  var email = $('#ln-email').val();
  var password = $('#ln-password').val();
  if (email.length == 0 || email.trim().length == 0) {
    alert('請輸入信箱');
    return;
  }
  $('#loading').show();
  firebase.auth().signInWithEmailAndPassword(email, password).then(function(user) {
    // Set last login time.
    firebase.database().ref('users/' + user.uid + '/lastLogin').set(firebase.database.ServerValue.TIMESTAMP);
    // Get user data.
    firebase.database().ref('users/' + user.uid).once('value', function(snapshot) {
      $('#loading').hide();
      var name = snapshot.child('name').val();
      var id = snapshot.child('id').val()
      $('#login').hide();
      $('#loading').hide();
      $('#reserve').show();
      $('#tl-user').text(name);
      account = { firebaseId: user.uid, id: id, name: name, email: email };
      var now = new Date(snapshot.child('lastLogin').val());
      loginDate = {
        year: now.getFullYear(),
        month: now.getMonth(),
        date: now.getDate(),
        week: now.getDay()
      };
      // Init reserve table.
      initDate(false);
      room = 1;
      listenToReserveData(false);
    });
  }).catch(function(error) {
    $('#loading').hide();
    alert('登入失敗\n' + error.code + '\n' + error.message);
  });
});

function getOffsetDate(offset) {
  var monthArray = new Array(31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31);
  if (loginDate.year % 4 == 0) monthArray[1] = 29;

  var date = loginDate.date + offset;
  var month = loginDate.month;
  var year = loginDate.year;
  if (date < 1) {
    if (month == 0) {
      date += 31; month = 11; --year;
    } else {
      date += monthArray[--month];
    }
  } else if (date > monthArray[loginDate.month]) {
    if (month == 11) {
      date -= 31; month = 0; ++year;
    } else {
      date -= monthArray[++month];
    }
  }

  return { year: year, date: ('0' + date).slice(-2), month: ('0' + ++month).slice(-2) };
}

// Initialize the date of thisWeek or nextWeek(according to boolean arg 'nextWeek').
function initDate(nextWeek) {
  if (loginDate == null) alert('錯誤#77');

  $('#re-nextweek').prop('disabled', nextWeek);
  $('#re-lastweek').prop('disabled', !nextWeek);
  $('#re-week').text(nextWeek ? '下周' : '本周');

  // Display the week.
  for (var i = 0; i < 7; ++i) {
    var offset = i - loginDate.week;
    if (nextWeek) offset += 7;
    var offsetDate = getOffsetDate(offset);

    var dateString = offsetDate.month + '-' + offsetDate.date;
    $('#re-' + weekArray[i]).text(dateString);
  }
}

function listenToReserveData(nextWeek) {
  if (loginDate == null) alert('錯誤#104');
  if (room == null) alert('錯誤#105');

  $('#re-btn-room1').prop('disabled', room == 1);
  $('#re-btn-room2').prop('disabled', room == 2);
  $('#re-btn-room3').prop('disabled', room == 3);

  // Get the date string that going to recive.
  var offset = -loginDate.week;
  if (nextWeek) offset += 7;
  offsetDate = getOffsetDate(offset);
  var dateString = offsetDate.year + offsetDate.month + offsetDate.date;

  var target = 'room' + room + '/' + dateString;
  // If date and room not change, return.
  if (listenTo == target) return;

  // Close the old listener and start a new one.
  if (listener != null) listener.off('value');

  listenTo = target;
  listener = firebase.database().ref(listenTo);
  $('.re-li').text('');
  listener.on('value', function(snapshot) {
    $('.re-li').text('');
    snapshot.forEach(function(child) {
      $('#re-' + child.key).text(child.child('name').val());
    });
  });
}

// Siwtch to new account page.
$('#ln-btn-new-account').click(function() {
  $('#login').hide();
  $('#new-account').show();
});

// Switch to login page
$('#na-btn-back-login').click(function() {
  $('#na-name').val('');
  $('#na-id').val('');
  $('#na-email').val('');
  $('#na-password').val('');
  $('#new-account').hide();
  $('#login').show();
});

// Create new account.
$('#na-btn-new-account').click(function() {
  name = $('#na-name').val();
  id = $('#na-id').val();
  password = $('#na-password').val();
  email = $('#na-email').val();

  if (name.length == 0 || name.trim().length == 0) {
    alert('請輸入名字');
    return;
  }
  if (id.length == 0 || id.trim().length == 0) {
    alert('請輸入學號');
    return;
  }

  $('#loading').show();
  firebase.auth().createUserWithEmailAndPassword(email, password).then(function(users) {
    // Create account in database.
    firebase.database().ref('users/' + users.uid).set({ name: name, id: id }, function(error) {
      $('#loading').hide();
      if (error) {
        alert('#錯誤171\n' + error.code + '\n' + error.message);
      } else {
        $('#na-name').val('');
        $('#na-id').val('');
        $('#na-email').val('');
        $('#na-password').val('');
        $('#new-account').hide();
        $('#login').show();
        alert('帳號建立成功');
      }
    });
  }).catch(function(error) {
    $('#loading').hide();
    alert('註冊失敗\n' + error.code + '\n' + error.message);
  });
});

$('#re-lastweek').click(function() {
  initDate(false);
  listenToReserveData(false);
});

$('#re-nextweek').click(function() {
  initDate(true);
  listenToReserveData(true);
});

$('.re-btn-room').click(function() {
  room = parseInt(this.id.substr(11, 12));
  initDate(false);
  listenToReserveData(false);
});

$('.re-li').click(function() {
  if ($(this).text() == '') {
    // Update data in users/<uid>/reserved/<data-time-room>/ and <room>/<date>/<time> simultaneously.
    if (confirm('預定此時間?')) {
      var reserveData = {};
      reserveData['users/' + account.firebaseId + '/reserved/' +
                  listenTo.substr(5, 13) + '-' + this.id.substr(3, 9) + '-' + listenTo.substr(0, 5)] = true;
      reserveData[listenTo + '/' + this.id.substr(3, 9)] = {
        name: account.name,
        id: account.id
      }
      firebase.database().ref().update(reserveData, function(error) {
        if (error) {
          alert('#錯誤211\n' + error.code + '\n' + error.message);
        } else {
          alert('成功預定');
        }
      });
    }
  } else if ($(this).text() == account.name) {
    if (confirm('取消預定?')) {
      var reserveData = {};
      reserveData['users/' + account.firebaseId + '/reserved/' +
                  listenTo.substr(5, 13) + '-' + this.id.substr(3, 9) + '-' + listenTo.substr(0, 5)] = null;
      reserveData[listenTo + '/' + this.id.substr(3, 9)] = null
      firebase.database().ref().update(reserveData, function(error) {
        if (error) {
          alert('#錯誤221\n' + error.code + '\n' + error.message);
        } else {
          alert('成功取消');
        }
      });
    }
  }
});

$('#tl-user').click(function() {
  alert("User's information testing\n" + account.name + '\n' + account.id + '\n' + account.email);
});
