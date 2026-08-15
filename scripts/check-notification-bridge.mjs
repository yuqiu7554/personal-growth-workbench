import fs from 'node:fs';
import assert from 'node:assert/strict';
const native = fs.readFileSync(new URL('../native-shell/main.m', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../workbench-prototype/app.js', import.meta.url), 'utf8');
for (const token of ['UNUserNotificationCenterDelegate','review.open','review.snooze15','review.skipToday','getNotificationStatus','requestNotificationPermission','openNotificationSystemSettings','previewNotificationSound','scheduleReviewReminders']) assert.ok(native.includes(token), `missing native notification behavior: ${token}`);
for (const sound of ['Glass','Ping','Pop','Submarine','Tink']) assert.ok(js.includes(sound), `missing sound: ${sound}`);
assert.ok(js.includes("window.confirm('工作台只会按你启用的类别发送提醒。是否现在请求 macOS 通知权限？')"));
console.log('notification-bridge: ok');
