#import <Cocoa/Cocoa.h>
#import <AVFoundation/AVFoundation.h>
#import <Quartz/Quartz.h>
#import <PDFKit/PDFKit.h>
#import <Speech/Speech.h>
#import <Vision/Vision.h>
#import <CommonCrypto/CommonDigest.h>
#import <Security/Security.h>
#import <WebKit/WebKit.h>
#import <UserNotifications/UserNotifications.h>
#import <sqlite3.h>

static NSString *const WorkbenchBundleIdentifier = @"com.qiuyu.personalgrowthworkbench";
static NSString *const WorkbenchLegacyBundleIdentifier = @"com.personal.growthworkbench.preview";
static NSString *const WorkbenchKeychainService = @"com.qiuyu.personalgrowthworkbench.ai";
static NSString *const WorkbenchLegacyKeychainService = @"com.personal.growthworkbench.preview.ai";
static NSString *const YoudaoAppIdAccount = @"youdao.app-id";
static NSString *const YoudaoAppSecretAccount = @"youdao.app-secret";
static NSString *const WorkbenchDatabasePathPreference = @"WorkbenchDatabasePath";
static NSString *const WorkbenchCustomIconPathPreference = @"WorkbenchCustomIconPath";
static NSString *const WorkbenchLibraryPathPreference = @"WorkbenchLibraryPath";
static NSString *const WorkbenchLibraryPathHistoryPreference = @"WorkbenchLibraryPathHistory";
static NSString *const WorkbenchCET6PathPreference = @"WorkbenchCET6Path";
static NSString *const WorkbenchCET6PathHistoryPreference = @"WorkbenchCET6PathHistory";
static NSString *const WorkbenchIELTSPathPreference = @"WorkbenchIELTSPath";
static NSString *const WorkbenchIELTSPathHistoryPreference = @"WorkbenchIELTSPathHistory";
static NSString *const WorkbenchIELTSRecordingPathPreference = @"WorkbenchIELTSRecordingPath";
static NSString *const WorkbenchIELTSRecordingPathHistoryPreference = @"WorkbenchIELTSRecordingPathHistory";
static NSString *const WorkbenchBackupPathPreference = @"WorkbenchBackupPath";

@interface WorkbenchAppDelegate : NSObject <NSApplicationDelegate, WKNavigationDelegate, WKScriptMessageHandler, QLPreviewPanelDataSource, AVCaptureFileOutputRecordingDelegate, UNUserNotificationCenterDelegate>
@property(nonatomic, strong) NSWindow *window;
@property(nonatomic, strong) WKWebView *webView;
@property(nonatomic, strong) NSMutableDictionary<NSString *, NSData *> *sessionAiKeys;
@property(nonatomic, strong) NSSpeechSynthesizer *speechSynthesizer;
@property(nonatomic, strong) AVAudioPlayer *trainingAudioPlayer;
@property(nonatomic, strong) NSURL *trainingPreviewURL;
@property(nonatomic, strong) AVCaptureSession *ieltsCaptureSession;
@property(nonatomic, strong) AVCaptureAudioFileOutput *ieltsAudioFileOutput;
@property(nonatomic, copy) NSString *ieltsRecordingPath;
@property(nonatomic, strong) NSDate *ieltsRecordingStartedAt;
@property(nonatomic, copy) NSString *pendingRestoreDirectory;
@property(nonatomic, copy) NSString *pendingRestorePayloadDirectory;
@property(nonatomic, strong) NSDictionary *pendingRestoreManifest;
@end

@implementation WorkbenchAppDelegate

- (void)applicationDidFinishLaunching:(NSNotification *)notification {
    [self migrateLegacyInstallationIfNeeded];
    [self configureMenus];
    self.sessionAiKeys = [NSMutableDictionary dictionary];
    [self applySavedApplicationIcon];
    UNUserNotificationCenter.currentNotificationCenter.delegate = self;
    UNNotificationAction *open = [UNNotificationAction actionWithIdentifier:@"review.open" title:@"打开复盘" options:UNNotificationActionOptionForeground];
    UNNotificationAction *snooze = [UNNotificationAction actionWithIdentifier:@"review.snooze15" title:@"15分钟后提醒" options:0];
    UNNotificationAction *skip = [UNNotificationAction actionWithIdentifier:@"review.skipToday" title:@"今日跳过" options:0];
    UNNotificationCategory *reviewCategory = [UNNotificationCategory categoryWithIdentifier:@"review.reminder" actions:@[open, snooze, skip] intentIdentifiers:@[] options:0];
    [UNUserNotificationCenter.currentNotificationCenter setNotificationCategories:[NSSet setWithObject:reviewCategory]];

    WKWebViewConfiguration *configuration = [[WKWebViewConfiguration alloc] init];
    configuration.websiteDataStore = [WKWebsiteDataStore defaultDataStore];
    [configuration.userContentController addScriptMessageHandler:self name:@"workbench"];
    self.webView = [[WKWebView alloc] initWithFrame:NSZeroRect configuration:configuration];
    self.webView.navigationDelegate = self;

    NSRect frame = NSMakeRect(0, 0, 1440, 900);
    NSWindowStyleMask style = NSWindowStyleMaskTitled | NSWindowStyleMaskClosable |
        NSWindowStyleMaskMiniaturizable | NSWindowStyleMaskResizable;
    self.window = [[NSWindow alloc] initWithContentRect:frame
                                             styleMask:style
                                               backing:NSBackingStoreBuffered
                                                 defer:NO];
    self.window.title = @"个人成长工作台";
    self.window.minSize = NSMakeSize(1024, 680);
    self.window.contentView = self.webView;
    [self.window center];
    [self.window setFrameAutosaveName:@"GrowthWorkbenchMainWindow"];
    [self.window makeKeyAndOrderFront:nil];

    NSURL *resources = NSBundle.mainBundle.resourceURL;
    NSURL *frontend = [resources URLByAppendingPathComponent:@"workbench-prototype" isDirectory:YES];
    NSURL *index = [frontend URLByAppendingPathComponent:@"index.html"];
    if (!resources || ![NSFileManager.defaultManager fileExistsAtPath:index.path]) {
        [self showLoadError:@"无法定位内嵌的工作台界面资源。"];
        return;
    }
    [self.webView loadFileURL:index allowingReadAccessToURL:frontend];
    [NSWorkspace.sharedWorkspace.notificationCenter addObserver:self selector:@selector(systemWillSleep:) name:NSWorkspaceWillSleepNotification object:nil];
    [NSWorkspace.sharedWorkspace.notificationCenter addObserver:self selector:@selector(systemDidWake:) name:NSWorkspaceDidWakeNotification object:nil];
    [NSApp activateIgnoringOtherApps:YES];
}

- (BOOL)applicationShouldTerminateAfterLastWindowClosed:(NSApplication *)sender {
    return YES;
}

- (void)userContentController:(WKUserContentController *)userContentController
      didReceiveScriptMessage:(WKScriptMessage *)message {
    if (![message.name isEqualToString:@"workbench"] || ![message.body isKindOfClass:NSDictionary.class]) return;
    NSDictionary *body = (NSDictionary *)message.body;
    NSString *action = [body[@"action"] isKindOfClass:NSString.class] ? body[@"action"] : @"";
    NSString *requestId = [body[@"requestId"] isKindOfClass:NSString.class] ? body[@"requestId"] : @"";
    NSString *account = [body[@"account"] isKindOfClass:NSString.class] ? body[@"account"] : @"codex";
    account = [account stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceAndNewlineCharacterSet];
    if (account.length == 0 || account.length > 64) {
        [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"invalid_account" }];
        return;
    }

    if ([action isEqualToString:@"getAiKeyStatus"]) {
        BOOL persisted = [self hasPersistedKeyForAccount:account];
        BOOL inSession = self.sessionAiKeys[account] != nil;
        [self sendNativeResult:@{ @"requestId": requestId, @"ok": @YES, @"configured": @(persisted || inSession),
            @"persistence": persisted ? @"keychain" : (inSession ? @"session" : @"none") }];
        return;
    }
    if ([action isEqualToString:@"getNotificationStatus"]) {
        [UNUserNotificationCenter.currentNotificationCenter getNotificationSettingsWithCompletionHandler:^(UNNotificationSettings *settings) {
            NSString *status = settings.authorizationStatus == UNAuthorizationStatusAuthorized ? @"authorized" : (settings.authorizationStatus == UNAuthorizationStatusDenied ? @"denied" : @"notDetermined");
            NSString *label = [status isEqualToString:@"authorized"] ? @"已允许" : ([status isEqualToString:@"denied"] ? @"已拒绝，请在系统设置中修改" : @"尚未请求");
            [self sendNativeResult:@{ @"requestId": requestId, @"ok": @YES, @"status": status, @"statusLabel": label }];
        }]; return;
    }
    if ([action isEqualToString:@"requestNotificationPermission"]) {
        [UNUserNotificationCenter.currentNotificationCenter requestAuthorizationWithOptions:(UNAuthorizationOptionAlert | UNAuthorizationOptionSound) completionHandler:^(BOOL granted, NSError *error) { [self sendNativeResult:error ? @{ @"requestId": requestId, @"ok": @NO, @"error": @"notification_permission_failed", @"detail": error.localizedDescription ?: @"" } : @{ @"requestId": requestId, @"ok": @YES, @"granted": @(granted) }]; }]; return;
    }
    if ([action isEqualToString:@"openNotificationSystemSettings"]) {
        BOOL opened = [NSWorkspace.sharedWorkspace openURL:[NSURL URLWithString:@"x-apple.systempreferences:com.apple.Notifications-Settings.extension"]]; [self sendNativeResult:@{ @"requestId": requestId, @"ok": @(opened) }]; return;
    }
    if ([action isEqualToString:@"previewNotificationSound"]) {
        NSString *sound = [body[@"sound"] isKindOfClass:NSString.class] ? body[@"sound"] : @"Glass"; if (![sound isEqualToString:@"silent"]) [[NSSound soundNamed:sound] play]; [self sendNativeResult:@{ @"requestId": requestId, @"ok": @YES }]; return;
    }
    if ([action isEqualToString:@"scheduleReviewReminders"]) {
        NSDictionary *settings = [body[@"settings"] isKindOfClass:NSDictionary.class] ? body[@"settings"] : @{}; [self scheduleReviewReminders:settings]; [self sendNativeResult:@{ @"requestId": requestId, @"ok": @YES }]; return;
    }
    if ([action isEqualToString:@"deleteAiKey"]) {
        [self.sessionAiKeys removeObjectForKey:account];
        OSStatus status = SecItemDelete((__bridge CFDictionaryRef)[self keychainQueryForAccount:account]);
        OSStatus legacyStatus = [self deleteLegacyKeyForAccount:account];
        BOOL ok = (status == errSecSuccess || status == errSecItemNotFound) &&
            (legacyStatus == errSecSuccess || legacyStatus == errSecItemNotFound || legacyStatus == errSecNotAvailable);
        [self sendNativeResult:ok ? @{ @"requestId": requestId, @"ok": @YES } : @{ @"requestId": requestId, @"ok": @NO, @"error": @"keychain_delete_failed" }];
        return;
    }
    if ([action isEqualToString:@"saveAiKey"]) {
        NSString *key = [body[@"key"] isKindOfClass:NSString.class] ? body[@"key"] : @"";
        if (key.length == 0 || key.length > 16384) {
            [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"invalid_key" }];
            return;
        }
        NSData *keyData = [key dataUsingEncoding:NSUTF8StringEncoding];
        NSDictionary *query = [self keychainQueryForAccount:account];
        NSDictionary *update = @{ (__bridge id)kSecValueData: keyData };
        OSStatus status = SecItemUpdate((__bridge CFDictionaryRef)query, (__bridge CFDictionaryRef)update);
        if (status == errSecItemNotFound) {
            NSMutableDictionary *attributes = [query mutableCopy];
            attributes[(__bridge id)kSecValueData] = keyData;
            attributes[(__bridge id)kSecAttrAccessible] = (__bridge id)kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly;
            status = SecItemAdd((__bridge CFDictionaryRef)attributes, NULL);
        }
        if (status == errSecParam || status == errSecNotAvailable) status = [self saveLegacyKeyData:keyData account:account];
        if (status == errSecSuccess) {
            [self.sessionAiKeys removeObjectForKey:account];
            [self sendNativeResult:@{ @"requestId": requestId, @"ok": @YES, @"persistence": @"keychain" }];
        } else {
            self.sessionAiKeys[account] = keyData;
            [self sendNativeResult:@{ @"requestId": requestId, @"ok": @YES, @"persistence": @"session" }];
        }
        return;
    }
    if ([action isEqualToString:@"getYoudaoStatus"]) {
        BOOL appIdConfigured = [self keyDataForAccount:YoudaoAppIdAccount] != nil;
        BOOL secretConfigured = [self keyDataForAccount:YoudaoAppSecretAccount] != nil;
        [self sendNativeResult:@{ @"requestId": requestId, @"ok": @YES,
            @"configured": @(appIdConfigured && secretConfigured) }];
        return;
    }
    if ([action isEqualToString:@"saveYoudaoCredentials"]) {
        NSString *appId = [body[@"appId"] isKindOfClass:NSString.class] ? body[@"appId"] : @"";
        NSString *appSecret = [body[@"appSecret"] isKindOfClass:NSString.class] ? body[@"appSecret"] : @"";
        appId = [appId stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceAndNewlineCharacterSet];
        if (appId.length == 0 || appId.length > 256 || appSecret.length == 0 || appSecret.length > 1024) {
            [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"invalid_credentials" }];
            return;
        }
        BOOL appIdSaved = [self saveSecretData:[appId dataUsingEncoding:NSUTF8StringEncoding] account:YoudaoAppIdAccount];
        BOOL secretSaved = [self saveSecretData:[appSecret dataUsingEncoding:NSUTF8StringEncoding] account:YoudaoAppSecretAccount];
        if (appIdSaved && secretSaved) {
            [self sendNativeResult:@{ @"requestId": requestId, @"ok": @YES }];
        } else {
            [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"keychain_save_failed" }];
        }
        return;
    }
    if ([action isEqualToString:@"deleteYoudaoCredentials"]) {
        BOOL appIdDeleted = [self deleteSecretForAccount:YoudaoAppIdAccount];
        BOOL secretDeleted = [self deleteSecretForAccount:YoudaoAppSecretAccount];
        [self sendNativeResult:(appIdDeleted && secretDeleted) ?
            @{ @"requestId": requestId, @"ok": @YES } :
            @{ @"requestId": requestId, @"ok": @NO, @"error": @"keychain_delete_failed" }];
        return;
    }
    if ([action isEqualToString:@"testYoudaoConnection"] || [action isEqualToString:@"lookupYoudao"]) {
        NSString *query = [action isEqualToString:@"testYoudaoConnection"] ? @"hello" :
            ([body[@"query"] isKindOfClass:NSString.class] ? body[@"query"] : @"");
        query = [query stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceAndNewlineCharacterSet];
        if (query.length == 0 || query.length > 500) {
            [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"invalid_query" }];
            return;
        }
        [self performYoudaoLookup:query requestId:requestId];
        return;
    }
    if ([action isEqualToString:@"speakYoudaoWord"]) {
        NSString *query = [body[@"query"] isKindOfClass:NSString.class] ? body[@"query"] : @"";
        query = [query stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceAndNewlineCharacterSet];
        if (query.length == 0 || query.length > 500) {
            [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"invalid_query" }];
            return;
        }
        if (!self.speechSynthesizer) self.speechSynthesizer = [[NSSpeechSynthesizer alloc] initWithVoice:nil];
        [self.speechSynthesizer stopSpeaking];
        BOOL started = [self.speechSynthesizer startSpeakingString:query];
        [self sendNativeResult:started ? @{ @"requestId": requestId, @"ok": @YES } :
            @{ @"requestId": requestId, @"ok": @NO, @"error": @"speech_failed" }];
        return;
    }
    if ([action isEqualToString:@"openYoudaoEntry"]) {
        NSString *query = [body[@"query"] isKindOfClass:NSString.class] ? body[@"query"] : @"";
        query = [query stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceAndNewlineCharacterSet];
        if (query.length == 0 || query.length > 500) {
            [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"invalid_query" }];
            return;
        }
        NSString *encoded = [query stringByAddingPercentEncodingWithAllowedCharacters:NSCharacterSet.URLQueryAllowedCharacterSet];
        NSURL *appURL = [NSURL URLWithString:[NSString stringWithFormat:@"yddict://m.youdao.com/dict?le=eng&q=%@", encoded ?: @""]];
        BOOL opened = appURL && [NSWorkspace.sharedWorkspace openURL:appURL];
        if (!opened) {
            NSURL *webURL = [NSURL URLWithString:[NSString stringWithFormat:@"https://www.youdao.com/result?word=%@&lang=en", encoded ?: @""]];
            opened = webURL && [NSWorkspace.sharedWorkspace openURL:webURL];
        }
        [self sendNativeResult:opened ? @{ @"requestId": requestId, @"ok": @YES } :
            @{ @"requestId": requestId, @"ok": @NO, @"error": @"open_failed" }];
        return;
    }
    if ([action isEqualToString:@"getApplicationIconStatus"]) {
        NSString *path = [NSUserDefaults.standardUserDefaults stringForKey:WorkbenchCustomIconPathPreference];
        BOOL configured = path.length && [NSFileManager.defaultManager fileExistsAtPath:path];
        [self sendNativeResult:@{ @"requestId": requestId, @"ok": @YES, @"configured": @(configured) }];
        return;
    }
    if ([action isEqualToString:@"chooseApplicationIcon"]) {
        [self chooseApplicationIconForRequestId:requestId];
        return;
    }
    if ([action isEqualToString:@"resetApplicationIcon"]) {
        NSString *path = [NSUserDefaults.standardUserDefaults stringForKey:WorkbenchCustomIconPathPreference];
        if (path.length) [NSFileManager.defaultManager removeItemAtPath:path error:nil];
        [NSUserDefaults.standardUserDefaults removeObjectForKey:WorkbenchCustomIconPathPreference];
        NSApp.applicationIconImage = nil;
        [NSWorkspace.sharedWorkspace setIcon:nil forFile:NSBundle.mainBundle.bundlePath options:0];
        [self sendNativeResult:@{ @"requestId": requestId, @"ok": @YES }];
        return;
    }
    if ([action isEqualToString:@"choosePaperPdf"]) {
        NSOpenPanel *panel = [NSOpenPanel openPanel];
        panel.title = @"选择论文 PDF";
        panel.prompt = @"关联 PDF";
        panel.canChooseFiles = YES;
        panel.canChooseDirectories = NO;
        panel.allowsMultipleSelection = NO;
        panel.allowedFileTypes = @[@"pdf"];
        [panel beginSheetModalForWindow:self.window completionHandler:^(NSModalResponse response) {
            if (response != NSModalResponseOK || !panel.URL) {
                [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"cancelled" }];
                return;
            }
            [self sendNativeResult:@{ @"requestId": requestId, @"ok": @YES,
                @"path": panel.URL.path ?: @"", @"fileName": panel.URL.lastPathComponent ?: @"" }];
        }];
        return;
    }
    if ([action isEqualToString:@"getLibraryStorageInfo"]) {
        NSString *path = [self libraryStoragePath];
        [self sendNativeResult:@{ @"requestId": requestId, @"ok": @YES, @"path": path }];
        return;
    }
    if ([action isEqualToString:@"chooseLibraryStorageDirectory"]) {
        NSString *oldPath = [self libraryStoragePath].stringByStandardizingPath;
        BOOL migrate = [body[@"migrate"] isKindOfClass:NSNumber.class] && [body[@"migrate"] boolValue];
        NSOpenPanel *panel = [NSOpenPanel openPanel];
        panel.title = @"选择资料库存储文件夹";
        panel.prompt = @"使用此文件夹";
        panel.canChooseFiles = NO;
        panel.canChooseDirectories = YES;
        panel.canCreateDirectories = YES;
        panel.allowsMultipleSelection = NO;
        [panel beginSheetModalForWindow:self.window completionHandler:^(NSModalResponse response) {
            if (response != NSModalResponseOK || !panel.URL) {
                [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"cancelled" }];
                return;
            }
            NSString *newPath = panel.URL.path.stringByStandardizingPath;
            NSError *migrationError = nil;
            NSDictionary *pathMap = migrate ? [self migrateLibraryFilesFrom:oldPath to:newPath error:&migrationError] : @{};
            if (migrate && !pathMap) { [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"library_migration_failed", @"detail": migrationError.localizedDescription ?: @"copy failed" }]; return; }
            [NSUserDefaults.standardUserDefaults setObject:newPath forKey:WorkbenchLibraryPathPreference];
            NSMutableArray *paths = [[NSUserDefaults.standardUserDefaults stringArrayForKey:WorkbenchLibraryPathHistoryPreference] mutableCopy] ?: [NSMutableArray array];
            if (![paths containsObject:newPath]) [paths addObject:newPath];
            [NSUserDefaults.standardUserDefaults setObject:paths forKey:WorkbenchLibraryPathHistoryPreference];
            [self sendNativeResult:@{ @"requestId": requestId, @"ok": @YES, @"path": newPath ?: @"", @"pathMap": pathMap ?: @{}, @"migrated": @(migrate) }];
        }];
        return;
    }
    if ([action isEqualToString:@"chooseLibraryFiles"] || [action isEqualToString:@"chooseLibraryFolder"]) {
        BOOL folderMode = [action isEqualToString:@"chooseLibraryFolder"];
        NSOpenPanel *panel = [NSOpenPanel openPanel];
        panel.title = folderMode ? @"选择需要导入资料库的文件夹" : @"选择需要导入资料库的文件";
        panel.prompt = folderMode ? @"扫描此文件夹" : @"选择资料";
        panel.canChooseFiles = !folderMode; panel.canChooseDirectories = folderMode;
        panel.allowsMultipleSelection = !folderMode;
        if (!folderMode) panel.allowedFileTypes = self.researchFileExtensions.allObjects;
        [panel beginSheetModalForWindow:self.window completionHandler:^(NSModalResponse response) {
            if (response != NSModalResponseOK || panel.URLs.count == 0) { [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"cancelled" }]; return; }
            NSMutableArray *files = [NSMutableArray array];
            if (folderMode) [files addObjectsFromArray:[self researchFilesInDirectory:panel.URL.path]];
            else for (NSURL *url in panel.URLs) { NSDictionary *info = [self researchFileInfo:url.path]; if (info) [files addObject:info]; }
            [self sendNativeResult:@{ @"requestId": requestId, @"ok": @YES, @"files": files }];
        }];
        return;
    }
    if ([action isEqualToString:@"importLibraryAsset"]) {
        NSString *source = [body[@"path"] isKindOfClass:NSString.class] ? body[@"path"] : @"";
        BOOL copy = ![body[@"copy"] isKindOfClass:NSNumber.class] || [body[@"copy"] boolValue];
        NSError *error = nil;
        NSString *destination = copy ? [self importResearchAssetAtPath:source projectId:@"Unified Library" error:&error] : ([self researchFileInfo:source] ? source.stringByStandardizingPath : nil);
        NSDictionary *info = destination ? [self researchFileInfo:destination] : nil;
        NSMutableDictionary *result = info ? [info mutableCopy] : nil;
        if (result) { result[@"requestId"] = requestId; result[@"ok"] = @YES; result[@"managed"] = @(copy); }
        [self sendNativeResult:result ?: @{ @"requestId": requestId, @"ok": @NO, @"error": @"library_import_failed", @"detail": error.localizedDescription ?: @"unsupported or missing file" }];
        return;
    }
    if ([action isEqualToString:@"openLibraryFile"]) {
        NSString *path = [body[@"path"] isKindOfClass:NSString.class] ? body[@"path"] : @"";
        NSDictionary *info = [self researchFileInfo:path];
        BOOL opened = info != nil;
        NSSet *external = [NSSet setWithArray:@[@"doc", @"docx", @"ppt", @"pptx", @"xls", @"xlsx"]];
        if (opened && [external containsObject:path.pathExtension.lowercaseString]) opened = [NSWorkspace.sharedWorkspace openURL:[NSURL fileURLWithPath:path]];
        else if (opened) { self.trainingPreviewURL = [NSURL fileURLWithPath:path]; QLPreviewPanel *panel = QLPreviewPanel.sharedPreviewPanel; panel.dataSource = self; [panel reloadData]; [panel makeKeyAndOrderFront:nil]; }
        [self sendNativeResult:opened ? @{ @"requestId": requestId, @"ok": @YES } : @{ @"requestId": requestId, @"ok": @NO, @"error": @"open_failed" }];
        return;
    }
    if ([action isEqualToString:@"importPaperPdf"]) {
        NSString *source = [body[@"path"] isKindOfClass:NSString.class] ? body[@"path"] : @"";
        NSError *copyError = nil;
        NSString *destination = [self importPaperPdfAtPath:source error:&copyError];
        [self sendNativeResult:destination ? @{ @"requestId": requestId, @"ok": @YES,
            @"path": destination, @"fileName": destination.lastPathComponent } :
            @{ @"requestId": requestId, @"ok": @NO, @"error": @"pdf_import_failed",
                @"detail": copyError.localizedDescription ?: @"invalid PDF" }];
        return;
    }
    if ([action isEqualToString:@"deleteManagedLibraryFile"]) {
        NSString *path = [body[@"path"] isKindOfClass:NSString.class] ? body[@"path"] : @"";
        NSString *standardized = path.stringByStandardizingPath;
        NSMutableArray<NSString *> *roots = [[NSUserDefaults.standardUserDefaults stringArrayForKey:WorkbenchLibraryPathHistoryPreference] mutableCopy] ?: [NSMutableArray array];
        NSString *currentRoot = [self libraryStoragePath].stringByStandardizingPath;
        if (currentRoot.length && ![roots containsObject:currentRoot]) [roots addObject:currentRoot];
        BOOL allowed = NO;
        for (NSString *root in roots) {
            if ([standardized hasPrefix:[root.stringByStandardizingPath stringByAppendingString:@"/"]]) { allowed = YES; break; }
        }
        if (!allowed || ![standardized.pathExtension.lowercaseString isEqualToString:@"pdf"]) {
            [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"managed_path_required" }];
            return;
        }
        NSError *deleteError = nil;
        BOOL exists = [NSFileManager.defaultManager fileExistsAtPath:standardized];
        BOOL deleted = !exists || [NSFileManager.defaultManager removeItemAtPath:standardized error:&deleteError];
        [self sendNativeResult:deleted ? @{ @"requestId": requestId, @"ok": @YES } : @{ @"requestId": requestId, @"ok": @NO, @"error": @"file_delete_failed", @"detail": deleteError.localizedDescription ?: @"" }];
        return;
    }
    if ([action isEqualToString:@"chooseResearchFiles"] || [action isEqualToString:@"chooseResearchFolder"]) {
        BOOL folderMode = [action isEqualToString:@"chooseResearchFolder"];
        NSOpenPanel *panel = [NSOpenPanel openPanel];
        panel.title = folderMode ? @"选择论文项目资料文件夹" : @"选择论文项目资料";
        panel.prompt = folderMode ? @"扫描此文件夹" : @"选择资料";
        panel.canChooseFiles = !folderMode; panel.canChooseDirectories = folderMode;
        panel.allowsMultipleSelection = !folderMode;
        if (!folderMode) panel.allowedFileTypes = self.researchFileExtensions.allObjects;
        [panel beginSheetModalForWindow:self.window completionHandler:^(NSModalResponse response) {
            if (response != NSModalResponseOK || panel.URLs.count == 0) { [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"cancelled" }]; return; }
            NSMutableArray *files = [NSMutableArray array];
            if (folderMode) [files addObjectsFromArray:[self researchFilesInDirectory:panel.URL.path]];
            else for (NSURL *url in panel.URLs) { NSDictionary *info = [self researchFileInfo:url.path]; if (info) [files addObject:info]; }
            [self sendNativeResult:@{ @"requestId": requestId, @"ok": @YES, @"files": files, @"source": panel.URLs.firstObject.path ?: @"" }];
        }];
        return;
    }
    if ([action isEqualToString:@"importResearchAsset"]) {
        NSString *source = [body[@"path"] isKindOfClass:NSString.class] ? body[@"path"] : @"";
        NSString *projectId = [body[@"projectId"] isKindOfClass:NSString.class] ? body[@"projectId"] : @"project";
        BOOL copy = ![body[@"copy"] isKindOfClass:NSNumber.class] || [body[@"copy"] boolValue];
        NSError *error = nil;
        NSString *destination = copy ? [self importResearchAssetAtPath:source projectId:projectId error:&error] : ([self researchFileInfo:source] ? source.stringByStandardizingPath : nil);
        NSDictionary *info = destination ? [self researchFileInfo:destination] : nil;
        NSMutableDictionary *result = info ? [info mutableCopy] : nil;
        if (result) { result[@"requestId"] = requestId; result[@"ok"] = @YES; result[@"managed"] = @(copy); }
        [self sendNativeResult:result ?: @{ @"requestId": requestId, @"ok": @NO, @"error": @"research_import_failed", @"detail": error.localizedDescription ?: @"unsupported or missing file" }];
        return;
    }
    if ([action isEqualToString:@"deleteManagedResearchFile"]) {
        NSString *path = [body[@"path"] isKindOfClass:NSString.class] ? [body[@"path"] stringByStandardizingPath] : @"";
        BOOL allowed = [self isPath:path insideRecordedRootsForPreference:WorkbenchLibraryPathHistoryPreference current:self.libraryStoragePath];
        if (!allowed || ![self.researchFileExtensions containsObject:path.pathExtension.lowercaseString]) { [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"managed_path_required" }]; return; }
        NSError *error = nil; BOOL exists = [NSFileManager.defaultManager fileExistsAtPath:path]; BOOL deleted = !exists || [NSFileManager.defaultManager removeItemAtPath:path error:&error];
        [self sendNativeResult:deleted ? @{ @"requestId": requestId, @"ok": @YES } : @{ @"requestId": requestId, @"ok": @NO, @"error": @"file_delete_failed", @"detail": error.localizedDescription ?: @"" }];
        return;
    }
    if ([action isEqualToString:@"openResearchFile"]) {
        NSString *path = [body[@"path"] isKindOfClass:NSString.class] ? body[@"path"] : @"";
        BOOL opened = [self researchFileInfo:path] != nil;
        if (opened) { self.trainingPreviewURL = [NSURL fileURLWithPath:path]; QLPreviewPanel *panel = QLPreviewPanel.sharedPreviewPanel; panel.dataSource = self; [panel reloadData]; [panel makeKeyAndOrderFront:nil]; }
        [self sendNativeResult:opened ? @{ @"requestId": requestId, @"ok": @YES } : @{ @"requestId": requestId, @"ok": @NO, @"error": @"open_failed" }];
        return;
    }
    if ([action isEqualToString:@"openResearchComparison"]) {
        NSArray *paths = [body[@"paths"] isKindOfClass:NSArray.class] ? body[@"paths"] : @[]; BOOL opened = paths.count == 2;
        for (NSString *path in paths) { if (![self researchFileInfo:path] || ![NSWorkspace.sharedWorkspace openURL:[NSURL fileURLWithPath:path]]) { opened = NO; break; } }
        [self sendNativeResult:opened ? @{ @"requestId": requestId, @"ok": @YES } : @{ @"requestId": requestId, @"ok": @NO, @"error": @"comparison_open_failed" }];
        return;
    }
    if ([action isEqualToString:@"chooseAndExtractResearchText"]) {
        NSOpenPanel *panel = [NSOpenPanel openPanel]; panel.title = @"选择需要本地提取文字的资料"; panel.prompt = @"提取文字";
        panel.canChooseFiles = YES; panel.canChooseDirectories = NO; panel.allowsMultipleSelection = NO;
        panel.allowedFileTypes = @[@"pdf", @"png", @"jpg", @"jpeg", @"heic", @"tiff", @"txt", @"md", @"rtf", @"csv", @"doc", @"docx"];
        [panel beginSheetModalForWindow:self.window completionHandler:^(NSModalResponse response) {
            if (response != NSModalResponseOK || !panel.URL) { [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"cancelled" }]; return; }
            [self extractEnglishTextAtURL:panel.URL completion:^(NSString *text, NSError *error) { [self sendNativeResult:text.length ? @{ @"requestId": requestId, @"ok": @YES, @"text": text, @"fileName": panel.URL.lastPathComponent ?: @"" } : @{ @"requestId": requestId, @"ok": @NO, @"error": @"text_extraction_failed", @"detail": error.localizedDescription ?: @"未识别到文字" }]; }];
        }];
        return;
    }
    if ([action isEqualToString:@"chooseCet6MaterialFolder"] || [action isEqualToString:@"chooseCet6MaterialFiles"]) {
        BOOL folderMode = [action isEqualToString:@"chooseCet6MaterialFolder"];
        NSOpenPanel *panel = [NSOpenPanel openPanel];
        panel.title = folderMode ? @"选择 CET-6 真题文件夹" : @"选择 CET-6 资料";
        panel.prompt = folderMode ? @"扫描此文件夹" : @"选择资料";
        panel.canChooseFiles = !folderMode;
        panel.canChooseDirectories = folderMode;
        panel.allowsMultipleSelection = !folderMode;
        if (!folderMode) panel.allowedFileTypes = @[@"pdf", @"png", @"jpg", @"jpeg", @"heic", @"doc", @"docx", @"mp3", @"m4a", @"wav", @"aac"];
        [panel beginSheetModalForWindow:self.window completionHandler:^(NSModalResponse response) {
            if (response != NSModalResponseOK || panel.URLs.count == 0) {
                [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"cancelled" }];
                return;
            }
            NSMutableArray *files = [NSMutableArray array];
            if (folderMode) [files addObjectsFromArray:[self trainingFilesInDirectory:panel.URL.path]];
            else for (NSURL *url in panel.URLs) { NSDictionary *info = [self trainingFileInfo:url.path]; if (info) [files addObject:info]; }
            [self sendNativeResult:@{ @"requestId": requestId, @"ok": @YES, @"files": files, @"source": panel.URLs.firstObject.path ?: @"" }];
        }];
        return;
    }
    if ([action isEqualToString:@"getCet6StorageInfo"]) {
        [self sendNativeResult:@{ @"requestId": requestId, @"ok": @YES, @"path": [self cet6StoragePath] }];
        return;
    }
    if ([action isEqualToString:@"chooseCet6StorageDirectory"]) {
        NSOpenPanel *panel = [NSOpenPanel openPanel];
        panel.title = @"选择 CET-6 资料存储文件夹"; panel.prompt = @"使用此文件夹";
        panel.canChooseFiles = NO; panel.canChooseDirectories = YES; panel.canCreateDirectories = YES;
        [panel beginSheetModalForWindow:self.window completionHandler:^(NSModalResponse response) {
            if (response != NSModalResponseOK || !panel.URL) {
                [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"cancelled" }]; return;
            }
            [NSUserDefaults.standardUserDefaults setObject:panel.URL.path forKey:WorkbenchCET6PathPreference];
            NSMutableArray *paths = [[NSUserDefaults.standardUserDefaults stringArrayForKey:WorkbenchCET6PathHistoryPreference] mutableCopy] ?: [NSMutableArray array];
            if (![paths containsObject:panel.URL.path]) [paths addObject:panel.URL.path];
            [NSUserDefaults.standardUserDefaults setObject:paths forKey:WorkbenchCET6PathHistoryPreference];
            [self sendNativeResult:@{ @"requestId": requestId, @"ok": @YES, @"path": panel.URL.path ?: @"" }];
        }];
        return;
    }
    if ([action isEqualToString:@"importCet6Asset"]) {
        NSString *source = [body[@"path"] isKindOfClass:NSString.class] ? body[@"path"] : @"";
        BOOL copy = ![body[@"copy"] isKindOfClass:NSNumber.class] || [body[@"copy"] boolValue];
        NSError *importError = nil;
        NSString *destination = copy ? [self importCet6AssetAtPath:source error:&importError] : ([self trainingFileInfo:source] ? source.stringByStandardizingPath : nil);
        [self sendNativeResult:destination ? @{ @"requestId": requestId, @"ok": @YES, @"path": destination, @"fileName": destination.lastPathComponent, @"managed": @(copy) } : @{ @"requestId": requestId, @"ok": @NO, @"error": @"cet6_import_failed", @"detail": importError.localizedDescription ?: @"unsupported or missing file" }];
        return;
    }
    if ([action isEqualToString:@"deleteManagedCet6File"]) {
        NSString *path = [body[@"path"] isKindOfClass:NSString.class] ? [body[@"path"] stringByStandardizingPath] : @"";
        NSMutableArray *roots = [[NSUserDefaults.standardUserDefaults stringArrayForKey:WorkbenchCET6PathHistoryPreference] mutableCopy] ?: [NSMutableArray array];
        NSString *current = [self cet6StoragePath].stringByStandardizingPath; if (current.length && ![roots containsObject:current]) [roots addObject:current];
        BOOL allowed = NO; for (NSString *root in roots) if ([path hasPrefix:[root.stringByStandardizingPath stringByAppendingString:@"/"]]) { allowed = YES; break; }
        if (!allowed || ![[self trainingFileExtensions] containsObject:path.pathExtension.lowercaseString]) { [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"managed_path_required" }]; return; }
        NSError *error = nil; BOOL exists = [NSFileManager.defaultManager fileExistsAtPath:path]; BOOL deleted = !exists || [NSFileManager.defaultManager removeItemAtPath:path error:&error];
        [self sendNativeResult:deleted ? @{ @"requestId": requestId, @"ok": @YES } : @{ @"requestId": requestId, @"ok": @NO, @"error": @"file_delete_failed", @"detail": error.localizedDescription ?: @"" }];
        return;
    }
    if ([action isEqualToString:@"chooseIeltsMaterialFolder"] || [action isEqualToString:@"chooseIeltsMaterialFiles"]) {
        BOOL folderMode = [action isEqualToString:@"chooseIeltsMaterialFolder"];
        NSOpenPanel *panel = [NSOpenPanel openPanel];
        panel.title = folderMode ? @"选择 IELTS 真题文件夹" : @"选择 IELTS 资料";
        panel.prompt = folderMode ? @"扫描此文件夹" : @"选择资料";
        panel.canChooseFiles = !folderMode; panel.canChooseDirectories = folderMode; panel.allowsMultipleSelection = !folderMode;
        if (!folderMode) panel.allowedFileTypes = self.trainingFileExtensions.allObjects;
        [panel beginSheetModalForWindow:self.window completionHandler:^(NSModalResponse response) {
            if (response != NSModalResponseOK || panel.URLs.count == 0) { [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"cancelled" }]; return; }
            NSMutableArray *files = [NSMutableArray array];
            if (folderMode) [files addObjectsFromArray:[self trainingFilesInDirectory:panel.URL.path]];
            else for (NSURL *url in panel.URLs) { NSDictionary *info = [self trainingFileInfo:url.path]; if (info) [files addObject:info]; }
            [self sendNativeResult:@{ @"requestId": requestId, @"ok": @YES, @"files": files }];
        }];
        return;
    }
    if ([action isEqualToString:@"getIeltsStorageInfo"] || [action isEqualToString:@"getIeltsRecordingStorageInfo"]) {
        NSString *path = [action isEqualToString:@"getIeltsStorageInfo"] ? [self ieltsStoragePath] : [self ieltsRecordingStoragePath];
        [self sendNativeResult:@{ @"requestId": requestId, @"ok": @YES, @"path": path }]; return;
    }
    if ([action isEqualToString:@"chooseIeltsStorageDirectory"] || [action isEqualToString:@"chooseIeltsRecordingDirectory"]) {
        BOOL recordings = [action isEqualToString:@"chooseIeltsRecordingDirectory"];
        NSOpenPanel *panel = [NSOpenPanel openPanel]; panel.title = recordings ? @"选择 IELTS 口语录音文件夹" : @"选择 IELTS 资料文件夹"; panel.prompt = @"使用此文件夹";
        panel.canChooseFiles = NO; panel.canChooseDirectories = YES; panel.canCreateDirectories = YES;
        [panel beginSheetModalForWindow:self.window completionHandler:^(NSModalResponse response) {
            if (response != NSModalResponseOK || !panel.URL) { [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"cancelled" }]; return; }
            NSString *preference = recordings ? WorkbenchIELTSRecordingPathPreference : WorkbenchIELTSPathPreference;
            NSString *historyPreference = recordings ? WorkbenchIELTSRecordingPathHistoryPreference : WorkbenchIELTSPathHistoryPreference;
            [NSUserDefaults.standardUserDefaults setObject:panel.URL.path forKey:preference];
            NSMutableArray *paths = [[NSUserDefaults.standardUserDefaults stringArrayForKey:historyPreference] mutableCopy] ?: [NSMutableArray array];
            if (![paths containsObject:panel.URL.path]) [paths addObject:panel.URL.path];
            [NSUserDefaults.standardUserDefaults setObject:paths forKey:historyPreference];
            [self sendNativeResult:@{ @"requestId": requestId, @"ok": @YES, @"path": panel.URL.path }];
        }];
        return;
    }
    if ([action isEqualToString:@"importIeltsAsset"]) {
        NSString *source = [body[@"path"] isKindOfClass:NSString.class] ? body[@"path"] : @"";
        BOOL copy = ![body[@"copy"] isKindOfClass:NSNumber.class] || [body[@"copy"] boolValue];
        NSError *error = nil; NSString *destination = copy ? [self importIeltsAssetAtPath:source error:&error] : ([self trainingFileInfo:source] ? source.stringByStandardizingPath : nil);
        [self sendNativeResult:destination ? @{ @"requestId": requestId, @"ok": @YES, @"path": destination, @"fileName": destination.lastPathComponent, @"managed": @(copy) } : @{ @"requestId": requestId, @"ok": @NO, @"error": @"ielts_import_failed", @"detail": error.localizedDescription ?: @"unsupported or missing file" }];
        return;
    }
    if ([action isEqualToString:@"deleteManagedIeltsFile"]) {
        NSString *path = [body[@"path"] isKindOfClass:NSString.class] ? [body[@"path"] stringByStandardizingPath] : @"";
        BOOL allowed = [self isPath:path insideRecordedRootsForPreference:WorkbenchIELTSPathHistoryPreference current:[self ieltsStoragePath]];
        NSError *error = nil; BOOL deleted = allowed && (![NSFileManager.defaultManager fileExistsAtPath:path] || [NSFileManager.defaultManager removeItemAtPath:path error:&error]);
        [self sendNativeResult:deleted ? @{ @"requestId": requestId, @"ok": @YES } : @{ @"requestId": requestId, @"ok": @NO, @"error": @"file_delete_failed", @"detail": error.localizedDescription ?: @"managed path required" }]; return;
    }
    if ([action isEqualToString:@"chooseAndExtractEnglishText"]) {
        NSOpenPanel *panel = [NSOpenPanel openPanel]; panel.title = @"选择需要提取文字的文件"; panel.prompt = @"提取文字";
        panel.canChooseFiles = YES; panel.canChooseDirectories = NO; panel.allowsMultipleSelection = NO;
        panel.allowedFileTypes = @[@"pdf", @"png", @"jpg", @"jpeg", @"heic", @"tiff", @"txt", @"doc", @"docx"];
        [panel beginSheetModalForWindow:self.window completionHandler:^(NSModalResponse response) {
            if (response != NSModalResponseOK || !panel.URL) { [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"cancelled" }]; return; }
            [self extractEnglishTextAtURL:panel.URL completion:^(NSString *text, NSError *error) {
                [self sendNativeResult:text.length ? @{ @"requestId": requestId, @"ok": @YES, @"text": text, @"fileName": panel.URL.lastPathComponent ?: @"" } : @{ @"requestId": requestId, @"ok": @NO, @"error": @"text_extraction_failed", @"detail": error.localizedDescription ?: @"未识别到文字" }];
            }];
        }];
        return;
    }
    if ([action isEqualToString:@"listAudioInputDevices"]) {
        NSMutableArray *devices = [NSMutableArray array];
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
        for (AVCaptureDevice *device in [AVCaptureDevice devicesWithMediaType:AVMediaTypeAudio]) [devices addObject:@{ @"id": device.uniqueID ?: @"", @"name": device.localizedName ?: @"麦克风" }];
#pragma clang diagnostic pop
        [self sendNativeResult:@{ @"requestId": requestId, @"ok": @YES, @"devices": devices }]; return;
    }
    if ([action isEqualToString:@"startIeltsRecording"]) {
        NSString *microphoneId = [body[@"microphoneId"] isKindOfClass:NSString.class] ? body[@"microphoneId"] : @"";
        BOOL temporary = [body[@"temporary"] boolValue];
        [self startIeltsRecordingWithMicrophoneId:microphoneId temporary:temporary completion:^(NSString *path, NSError *error) {
            [self sendNativeResult:path ? @{ @"requestId": requestId, @"ok": @YES, @"path": path } : @{ @"requestId": requestId, @"ok": @NO, @"error": error.code == 1 ? @"microphone_permission_denied" : @"recording_failed", @"detail": error.localizedDescription ?: @"" }];
        }];
        return;
    }
    if ([action isEqualToString:@"pauseIeltsRecording"] || [action isEqualToString:@"resumeIeltsRecording"]) {
        BOOL pause = [action isEqualToString:@"pauseIeltsRecording"];
        if (!self.ieltsAudioFileOutput.isRecording) { [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"recording_not_active" }]; return; }
        if (pause) [self.ieltsAudioFileOutput pauseRecording]; else [self.ieltsAudioFileOutput resumeRecording];
        [self sendNativeResult:@{ @"requestId": requestId, @"ok": @YES, @"paused": @(pause) }]; return;
    }
    if ([action isEqualToString:@"stopIeltsRecording"]) {
        if (!self.ieltsAudioFileOutput.isRecording) { [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"recording_not_active" }]; return; }
        NSTimeInterval duration = CMTimeGetSeconds(self.ieltsAudioFileOutput.recordedDuration);
        if (!isfinite(duration) || duration < 0) duration = self.ieltsRecordingStartedAt ? -self.ieltsRecordingStartedAt.timeIntervalSinceNow : 0;
        NSString *path = self.ieltsRecordingPath ?: @""; [self.ieltsAudioFileOutput stopRecording]; [self.ieltsCaptureSession stopRunning];
        [self sendNativeResult:@{ @"requestId": requestId, @"ok": @YES, @"path": path, @"duration": @(duration) }]; return;
    }
    if ([action isEqualToString:@"deleteIeltsRecordingAsset"]) {
        NSString *path = [body[@"path"] isKindOfClass:NSString.class] ? [body[@"path"] stringByStandardizingPath] : @"";
        BOOL temporary = [path hasPrefix:[NSTemporaryDirectory().stringByStandardizingPath stringByAppendingString:@"/"]] && [path.lastPathComponent hasPrefix:@"ielts-speaking-"];
        BOOL allowed = temporary || [self isPath:path insideRecordedRootsForPreference:WorkbenchIELTSRecordingPathHistoryPreference current:[self ieltsRecordingStoragePath]];
        NSError *error = nil; BOOL deleted = allowed && (![NSFileManager.defaultManager fileExistsAtPath:path] || [NSFileManager.defaultManager removeItemAtPath:path error:&error]);
        [self sendNativeResult:deleted ? @{ @"requestId": requestId, @"ok": @YES } : @{ @"requestId": requestId, @"ok": @NO, @"error": @"recording_delete_failed", @"detail": error.localizedDescription ?: @"managed path required" }]; return;
    }
    if ([action isEqualToString:@"transcribeIeltsRecording"]) {
        NSString *path = [body[@"path"] isKindOfClass:NSString.class] ? body[@"path"] : @"";
        [self transcribeIeltsRecordingAtPath:path completion:^(NSString *text, BOOL onDevice, NSError *error) {
            [self sendNativeResult:text ? @{ @"requestId": requestId, @"ok": @YES, @"text": text, @"onDevice": @(onDevice) } : @{ @"requestId": requestId, @"ok": @NO, @"error": @"transcription_failed", @"detail": error.localizedDescription ?: @"" }];
        }];
        return;
    }
    if ([action isEqualToString:@"openLocalTrainingFile"]) {
        NSString *path = [body[@"path"] isKindOfClass:NSString.class] ? body[@"path"] : @"";
        BOOL opened = [self trainingFileInfo:path] != nil;
        if (opened) {
            self.trainingPreviewURL = [NSURL fileURLWithPath:path];
            QLPreviewPanel *panel = QLPreviewPanel.sharedPreviewPanel;
            panel.dataSource = self; [panel reloadData]; [panel makeKeyAndOrderFront:nil];
        }
        [self sendNativeResult:opened ? @{ @"requestId": requestId, @"ok": @YES } : @{ @"requestId": requestId, @"ok": @NO, @"error": @"open_failed" }];
        return;
    }
    if ([action isEqualToString:@"loadTrainingAudio"]) {
        NSString *path = [body[@"path"] isKindOfClass:NSString.class] ? body[@"path"] : @"";
        NSDictionary *info = [self trainingFileInfo:path];
        NSSet *audioExtensions = [NSSet setWithArray:@[@"mp3", @"m4a", @"wav", @"aac"]];
        NSError *audioError = nil;
        self.trainingAudioPlayer = info && [audioExtensions containsObject:[path.pathExtension lowercaseString]] ? [[AVAudioPlayer alloc] initWithContentsOfURL:[NSURL fileURLWithPath:path] error:&audioError] : nil;
        [self.trainingAudioPlayer prepareToPlay];
        [self sendNativeResult:self.trainingAudioPlayer ? @{ @"requestId": requestId, @"ok": @YES, @"duration": @(self.trainingAudioPlayer.duration), @"currentTime": @(self.trainingAudioPlayer.currentTime) } : @{ @"requestId": requestId, @"ok": @NO, @"error": @"audio_load_failed", @"detail": audioError.localizedDescription ?: @"unsupported or missing audio" }];
        return;
    }
    if ([action isEqualToString:@"controlTrainingAudio"]) {
        NSString *command = [body[@"command"] isKindOfClass:NSString.class] ? body[@"command"] : @"";
        if (!self.trainingAudioPlayer) { [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"audio_not_loaded" }]; return; }
        if ([command isEqualToString:@"play"]) [self.trainingAudioPlayer play];
        else if ([command isEqualToString:@"pause"]) [self.trainingAudioPlayer pause];
        else if ([command isEqualToString:@"stop"]) { [self.trainingAudioPlayer stop]; self.trainingAudioPlayer.currentTime = 0; }
        else if ([command isEqualToString:@"seek"]) self.trainingAudioPlayer.currentTime = MIN(self.trainingAudioPlayer.duration, MAX(0, [body[@"seconds"] doubleValue]));
        else if ([command isEqualToString:@"skip"]) self.trainingAudioPlayer.currentTime = MIN(self.trainingAudioPlayer.duration, MAX(0, self.trainingAudioPlayer.currentTime + [body[@"seconds"] doubleValue]));
        else if ([command isEqualToString:@"set-rate"]) { self.trainingAudioPlayer.enableRate = YES; self.trainingAudioPlayer.rate = MIN(1.5, MAX(0.75, [body[@"rate"] floatValue])); }
        else { [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"invalid_audio_command" }]; return; }
        [self sendNativeResult:@{ @"requestId": requestId, @"ok": @YES, @"duration": @(self.trainingAudioPlayer.duration), @"currentTime": @(self.trainingAudioPlayer.currentTime), @"playing": @(self.trainingAudioPlayer.isPlaying) }];
        return;
    }
    if ([action isEqualToString:@"getTrainingAudioStatus"]) {
        [self sendNativeResult:@{ @"requestId": requestId, @"ok": @YES, @"loaded": @(self.trainingAudioPlayer != nil), @"duration": @(self.trainingAudioPlayer.duration), @"currentTime": @(self.trainingAudioPlayer.currentTime), @"playing": @(self.trainingAudioPlayer.isPlaying) }];
        return;
    }
    if ([action isEqualToString:@"getDatabaseInfo"]) {
        NSString *path = [self databasePath];
        [self sendNativeResult:@{ @"requestId": requestId, @"ok": @YES, @"engine": @"SQLite",
            @"path": path, @"exists": @([NSFileManager.defaultManager fileExistsAtPath:path]), @"schemaVersion": @1 }];
        return;
    }
    if ([action isEqualToString:@"fetchRecommendationSource"]) {
        NSString *source = [body[@"source"] isKindOfClass:NSString.class] ? body[@"source"] : @"";
        NSString *urlString = [body[@"url"] isKindOfClass:NSString.class] ? body[@"url"] : @"";
        NSURL *url = [NSURL URLWithString:urlString];
        NSSet<NSString *> *allowedHosts = [NSSet setWithArray:@[
            @"www.gov.cn", @"search.worldbank.org", @"api.openalex.org", @"api.crossref.org",
            @"www.technologyreview.com", @"www.easa.europa.eu", @"www.nist.gov",
            @"digital-strategy.ec.europa.eu", @"theloadstar.com", @"techcrunch.com"
        ]];
        if (![@[@"news", @"papers"] containsObject:source] || ![url.scheme.lowercaseString isEqualToString:@"https"] || ![allowedHosts containsObject:url.host.lowercaseString]) {
            [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"recommendation_source_not_allowed" }];
            return;
        }
        NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url];
        request.HTTPMethod = @"GET";
        request.timeoutInterval = 25.0;
        [request setValue:@"application/json, application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9" forHTTPHeaderField:@"Accept"];
        [request setValue:@"PersonalGrowthWorkbench/0.4 (local desktop app)" forHTTPHeaderField:@"User-Agent"];
        NSURLSessionConfiguration *config = NSURLSessionConfiguration.ephemeralSessionConfiguration;
        config.timeoutIntervalForRequest = 25.0;
        config.timeoutIntervalForResource = 30.0;
        [[[NSURLSession sessionWithConfiguration:config] dataTaskWithRequest:request completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
            NSHTTPURLResponse *http = [response isKindOfClass:NSHTTPURLResponse.class] ? (NSHTTPURLResponse *)response : nil;
            if (error || !http) {
                [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"recommendation_network_failed", @"detail": error.localizedDescription ?: @"" }];
                return;
            }
            if (http.statusCode < 200 || http.statusCode >= 300 || data.length > 5 * 1024 * 1024) {
                [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"recommendation_source_failed", @"status": @(http.statusCode) }];
                return;
            }
            NSString *contentType = [http.allHeaderFields[@"Content-Type"] isKindOfClass:NSString.class] ? http.allHeaderFields[@"Content-Type"] : @"";
            NSError *jsonError = nil;
            id json = [NSJSONSerialization JSONObjectWithData:data options:0 error:&jsonError];
            if (json && !jsonError && [NSJSONSerialization isValidJSONObject:json]) {
                [self sendNativeResult:@{ @"requestId": requestId, @"ok": @YES, @"source": source, @"format": @"json", @"data": json }];
                return;
            }
            NSString *text = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
            if (!text.length) text = [[NSString alloc] initWithData:data encoding:NSISOLatin1StringEncoding];
            if (!text.length || (!([text containsString:@"<rss"] || [text containsString:@"<feed"]))) {
                [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"recommendation_invalid_response" }];
                return;
            }
            [self sendNativeResult:@{ @"requestId": requestId, @"ok": @YES, @"source": source, @"format": @"xml", @"contentType": contentType, @"text": text }];
        }] resume];
        return;
    }
    if ([action isEqualToString:@"openExternalURL"]) {
        NSString *urlString = [body[@"url"] isKindOfClass:NSString.class] ? body[@"url"] : @"";
        NSURL *url = [NSURL URLWithString:urlString];
        if (!url || ![@[@"https", @"http"] containsObject:url.scheme.lowercaseString]) {
            [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"invalid_external_url" }];
            return;
        }
        BOOL opened = [NSWorkspace.sharedWorkspace openURL:url];
        [self sendNativeResult:opened ? @{ @"requestId": requestId, @"ok": @YES } : @{ @"requestId": requestId, @"ok": @NO, @"error": @"external_open_failed" }];
        return;
    }
    if ([action isEqualToString:@"loadWorkbenchState"]) {
        NSError *databaseError = nil;
        NSDictionary *storedState = [self loadWorkbenchState:&databaseError];
        if (databaseError) {
            [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"database_read_failed",
                @"detail": databaseError.localizedDescription ?: @"" }];
        } else {
            [self sendNativeResult:@{ @"requestId": requestId, @"ok": @YES, @"state": storedState ?: NSNull.null }];
        }
        return;
    }
    if ([action isEqualToString:@"saveWorkbenchState"]) {
        NSDictionary *workbenchState = [body[@"state"] isKindOfClass:NSDictionary.class] ? body[@"state"] : nil;
        if (!workbenchState || ![NSJSONSerialization isValidJSONObject:workbenchState]) {
            [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"invalid_state" }];
            return;
        }
        NSError *databaseError = nil;
        BOOL saved = [self saveWorkbenchState:workbenchState error:&databaseError];
        [self sendNativeResult:saved ? @{ @"requestId": requestId, @"ok": @YES } :
            @{ @"requestId": requestId, @"ok": @NO, @"error": @"database_write_failed",
               @"detail": databaseError.localizedDescription ?: @"" }];
        return;
    }
    if ([action isEqualToString:@"exportWorkbenchData"]) { NSDictionary *exportState = [body[@"state"] isKindOfClass:NSDictionary.class] ? body[@"state"] : nil; if (!exportState) { [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"invalid_state" }]; return; } NSSavePanel *panel = [NSSavePanel savePanel]; panel.title = @"导出工作台结构化数据"; panel.nameFieldStringValue = @"个人成长工作台-数据导出.json"; [panel beginSheetModalForWindow:self.window completionHandler:^(NSModalResponse response) { if (response != NSModalResponseOK || !panel.URL) { [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"cancelled" }]; return; } NSError *error = nil; NSData *data = [NSJSONSerialization dataWithJSONObject:exportState options:NSJSONWritingPrettyPrinted error:&error]; BOOL saved = data && [data writeToURL:panel.URL options:NSDataWritingAtomic error:&error]; [self sendNativeResult:saved ? @{ @"requestId": requestId, @"ok": @YES, @"path": panel.URL.path ?: @"" } : @{ @"requestId": requestId, @"ok": @NO, @"error": @"export_failed", @"detail": error.localizedDescription ?: @"" }]; }]; return; }
    if ([action isEqualToString:@"chooseDatabaseDirectory"]) {
        NSOpenPanel *panel = [NSOpenPanel openPanel];
        panel.title = @"选择数据库存储文件夹";
        panel.prompt = @"迁移到此处";
        panel.canChooseDirectories = YES;
        panel.canChooseFiles = NO;
        panel.canCreateDirectories = YES;
        panel.allowsMultipleSelection = NO;
        [panel beginSheetModalForWindow:self.window completionHandler:^(NSModalResponse response) {
            if (response != NSModalResponseOK || !panel.URL) {
                [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"operation_cancelled" }];
                return;
            }
            NSError *migrationError = nil;
            NSString *previousPath = [self databasePath];
            NSString *newPath = [self migrateDatabaseToDirectory:panel.URL error:&migrationError];
            if (newPath) {
                [self sendNativeResult:@{ @"requestId": requestId, @"ok": @YES, @"path": newPath,
                    @"previousPath": previousPath }];
            } else {
                [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"database_migration_failed",
                    @"detail": migrationError.localizedDescription ?: @"" }];
            }
        }];
        return;
    }
    if ([action isEqualToString:@"openDatabaseFolder"]) {
        NSURL *folder = [[NSURL fileURLWithPath:[self databasePath]] URLByDeletingLastPathComponent];
        BOOL opened = [NSWorkspace.sharedWorkspace openURL:folder];
        [self sendNativeResult:opened ? @{ @"requestId": requestId, @"ok": @YES } :
            @{ @"requestId": requestId, @"ok": @NO, @"error": @"open_folder_failed" }];
        return;
    }
    if ([action isEqualToString:@"getBackupInfo"]) {
        NSString *path = [NSUserDefaults.standardUserDefaults stringForKey:WorkbenchBackupPathPreference] ?: @""; [self sendNativeResult:@{ @"requestId": requestId, @"ok": @YES, @"path": path }]; return;
    }
    if ([action isEqualToString:@"openLocalFolder"]) { NSString *path = [body[@"path"] isKindOfClass:NSString.class] ? [body[@"path"] stringByStandardizingPath] : @""; NSString *allowed = [[NSUserDefaults.standardUserDefaults stringForKey:WorkbenchBackupPathPreference] stringByStandardizingPath]; BOOL opened = path.length && [path isEqualToString:allowed] && [NSWorkspace.sharedWorkspace openURL:[NSURL fileURLWithPath:path isDirectory:YES]]; [self sendNativeResult:opened ? @{ @"requestId": requestId, @"ok": @YES } : @{ @"requestId": requestId, @"ok": @NO, @"error": @"open_folder_failed" }]; return; }
    if ([action isEqualToString:@"chooseBackupDirectory"]) {
        NSOpenPanel *panel = [NSOpenPanel openPanel]; panel.title = @"选择加密备份保存文件夹"; panel.prompt = @"使用此文件夹"; panel.canChooseDirectories = YES; panel.canChooseFiles = NO; panel.canCreateDirectories = YES;
        [panel beginSheetModalForWindow:self.window completionHandler:^(NSModalResponse response) { if (response != NSModalResponseOK || !panel.URL) { [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"cancelled" }]; return; } [NSUserDefaults.standardUserDefaults setObject:panel.URL.path forKey:WorkbenchBackupPathPreference]; [self sendNativeResult:@{ @"requestId": requestId, @"ok": @YES, @"path": panel.URL.path ?: @"" }]; }]; return;
    }
    if ([action isEqualToString:@"createEncryptedBackup"]) {
        NSString *password = [body[@"password"] isKindOfClass:NSString.class] ? body[@"password"] : @""; NSString *directory = [NSUserDefaults.standardUserDefaults stringForKey:WorkbenchBackupPathPreference] ?: @""; NSError *backupError = nil; NSDictionary *result = [self createEncryptedBackupInDirectory:directory password:password error:&backupError]; [self sendNativeResult:result ? @{ @"requestId": requestId, @"ok": @YES, @"path": result[@"path"], @"bytes": result[@"bytes"], @"createdAt": result[@"createdAt"] } : @{ @"requestId": requestId, @"ok": @NO, @"error": @"backup_failed", @"detail": backupError.localizedDescription ?: @"" }]; return;
    }
    if ([action isEqualToString:@"inspectEncryptedBackup"]) {
        NSString *password = [body[@"password"] isKindOfClass:NSString.class] ? body[@"password"] : @""; NSOpenPanel *panel = [NSOpenPanel openPanel]; panel.title = @"选择个人成长工作台备份"; panel.allowedFileTypes = @[@"gwbbackup"]; panel.canChooseFiles = YES; panel.canChooseDirectories = NO;
        [panel beginSheetModalForWindow:self.window completionHandler:^(NSModalResponse response) { if (response != NSModalResponseOK || !panel.URL) { [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"cancelled" }]; return; } NSError *error = nil; NSDictionary *manifest = [self inspectEncryptedBackup:panel.URL.path password:password error:&error]; [self sendNativeResult:manifest ? @{ @"requestId": requestId, @"ok": @YES, @"manifest": manifest } : @{ @"requestId": requestId, @"ok": @NO, @"error": @"backup_decrypt_failed", @"detail": error.localizedDescription ?: @"" }]; }]; return;
    }
    if ([action isEqualToString:@"applyInspectedBackup"]) {
        NSError *error = nil; NSDictionary *restored = [self applyInspectedBackup:&error]; [self sendNativeResult:restored ? @{ @"requestId": requestId, @"ok": @YES, @"state": restored } : @{ @"requestId": requestId, @"ok": @NO, @"error": @"backup_restore_failed", @"detail": error.localizedDescription ?: @"" }]; return;
    }
    if ([action isEqualToString:@"checkGithubRelease"]) {
        NSString *repository = [body[@"repository"] isKindOfClass:NSString.class] ? body[@"repository"] : @""; NSRegularExpression *pattern = [NSRegularExpression regularExpressionWithPattern:@"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$" options:0 error:nil]; if ([pattern numberOfMatchesInString:repository options:0 range:NSMakeRange(0, repository.length)] != 1) { [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"invalid_repository" }]; return; }
        NSURL *url = [NSURL URLWithString:[NSString stringWithFormat:@"https://api.github.com/repos/%@/releases/latest", repository]]; NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url]; request.timeoutInterval = 15; [request setValue:@"PersonalGrowthWorkbench/0.4" forHTTPHeaderField:@"User-Agent"]; [[[NSURLSession sessionWithConfiguration:NSURLSessionConfiguration.ephemeralSessionConfiguration] dataTaskWithRequest:request completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) { NSHTTPURLResponse *http = (NSHTTPURLResponse *)response; if (error || ![http isKindOfClass:NSHTTPURLResponse.class]) { [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"network_failed", @"detail": error.localizedDescription ?: @"" }]; return; } if (http.statusCode == 404) { [self sendNativeResult:@{ @"requestId": requestId, @"ok": @YES, @"tag": @"", @"url": @"" }]; return; } NSDictionary *json = data ? [NSJSONSerialization JSONObjectWithData:data options:0 error:nil] : nil; NSString *tag = [json[@"tag_name"] isKindOfClass:NSString.class] ? json[@"tag_name"] : @""; NSString *releaseURL = [json[@"html_url"] isKindOfClass:NSString.class] ? json[@"html_url"] : @""; [self sendNativeResult:(http.statusCode >= 200 && http.statusCode < 300) ? @{ @"requestId": requestId, @"ok": @YES, @"tag": tag, @"url": releaseURL } : @{ @"requestId": requestId, @"ok": @NO, @"error": @"github_release_failed", @"status": @(http.statusCode) }]; }] resume]; return;
    }
    if ([action isEqualToString:@"testAiConnection"]) {
        NSString *provider = [body[@"provider"] isKindOfClass:NSString.class] ? body[@"provider"] : @"";
        NSString *baseUrl = [body[@"baseUrl"] isKindOfClass:NSString.class] ? body[@"baseUrl"] : @"";
        NSString *model = [body[@"model"] isKindOfClass:NSString.class] ? body[@"model"] : @"";
        NSData *keyData = [self keyDataForAccount:account];
        if (!keyData) {
            [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"key_not_found" }];
            return;
        }
        NSString *key = [[NSString alloc] initWithData:keyData encoding:NSUTF8StringEncoding];
        NSURL *url = [self modelsURLForBaseURL:baseUrl provider:provider];
        BOOL localHttp = [url.scheme.lowercaseString isEqualToString:@"http"] &&
            [@[@"localhost", @"127.0.0.1", @"::1"] containsObject:url.host.lowercaseString];
        if (!url || model.length == 0 || (![[url.scheme lowercaseString] isEqualToString:@"https"] && !localHttp)) {
            [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"invalid_url" }];
            return;
        }
        NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url];
        request.HTTPMethod = @"GET";
        request.timeoutInterval = 15.0;
        [request setValue:@"application/json" forHTTPHeaderField:@"Accept"];
        if ([provider isEqualToString:@"Anthropic官方API"]) {
            [request setValue:key forHTTPHeaderField:@"x-api-key"];
            [request setValue:@"2023-06-01" forHTTPHeaderField:@"anthropic-version"];
        } else {
            [request setValue:[@"Bearer " stringByAppendingString:key] forHTTPHeaderField:@"Authorization"];
        }
        NSURLSessionConfiguration *sessionConfig = NSURLSessionConfiguration.ephemeralSessionConfiguration;
        sessionConfig.timeoutIntervalForRequest = 15.0;
        sessionConfig.timeoutIntervalForResource = 15.0;
        NSURLSession *session = [NSURLSession sessionWithConfiguration:sessionConfig];
        NSURLSessionDataTask *task = [session dataTaskWithRequest:request completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
            NSHTTPURLResponse *http = [response isKindOfClass:NSHTTPURLResponse.class] ? (NSHTTPURLResponse *)response : nil;
            if (error || !http) {
                [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"network_failed" }];
            } else if (http.statusCode >= 200 && http.statusCode < 300) {
                NSDictionary *json = data ? [NSJSONSerialization JSONObjectWithData:data options:0 error:nil] : nil;
                NSArray *models = [json[@"data"] isKindOfClass:NSArray.class] ? json[@"data"] : @[];
                BOOL found = NO;
                NSMutableArray<NSString *> *modelIds = [NSMutableArray array];
                for (NSDictionary *item in models) {
                    if ([item[@"id"] isKindOfClass:NSString.class]) {
                        [modelIds addObject:item[@"id"]];
                        if ([item[@"id"] isEqualToString:model]) found = YES;
                    }
                }
                [self sendNativeResult:@{ @"requestId": requestId, @"ok": @YES, @"status": @(http.statusCode), @"modelVerified": @(found), @"models": modelIds }];
            } else {
                NSString *code = (http.statusCode == 401 || http.statusCode == 403) ? @"authentication_failed" :
                    (http.statusCode == 404 ? @"service_not_found" : (http.statusCode == 429 ? @"rate_limited" : @"service_error"));
                [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": code, @"status": @(http.statusCode) }];
            }
        }];
        [task resume];
        return;
    }
    if ([action isEqualToString:@"sendAiChat"]) {
        NSString *provider = [body[@"provider"] isKindOfClass:NSString.class] ? body[@"provider"] : @"";
        NSString *baseUrl = [body[@"baseUrl"] isKindOfClass:NSString.class] ? body[@"baseUrl"] : @"";
        NSString *model = [body[@"model"] isKindOfClass:NSString.class] ? body[@"model"] : @"";
        NSString *prompt = [body[@"prompt"] isKindOfClass:NSString.class] ? body[@"prompt"] : @"";
        NSDictionary *context = [body[@"context"] isKindOfClass:NSDictionary.class] ? body[@"context"] : @{};
        NSArray *attachments = [body[@"attachments"] isKindOfClass:NSArray.class] ? body[@"attachments"] : @[];
        NSData *keyData = [self keyDataForAccount:account];
        if (!keyData) { [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"key_not_found" }]; return; }
        if ([provider isEqualToString:@"Anthropic官方API"]) { [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"unsupported_provider" }]; return; }
        NSString *trimmed = [baseUrl stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceAndNewlineCharacterSet];
        while ([trimmed hasSuffix:@"/"]) trimmed = [trimmed substringToIndex:trimmed.length - 1];
        BOOL usesResponsesAPI = [provider isEqualToString:@"DeepSeek官方API"] && [model isEqualToString:@"deepseek-v4-flash"];
        NSString *path = [trimmed.lowercaseString hasSuffix:@"/v1"] ? @"/chat/completions" : @"/v1/chat/completions";
        if ([provider isEqualToString:@"DeepSeek官方API"]) path = usesResponsesAPI ? @"/responses" : @"/chat/completions";
        NSURL *url = [NSURL URLWithString:[trimmed stringByAppendingString:path]];
        BOOL localHttp = [url.scheme.lowercaseString isEqualToString:@"http"] && [@[@"localhost", @"127.0.0.1", @"::1"] containsObject:url.host.lowercaseString];
        if (!url || prompt.length == 0 || model.length == 0 || (![[url.scheme lowercaseString] isEqualToString:@"https"] && !localHttp)) { [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"invalid_url" }]; return; }

        NSData *contextData = [NSJSONSerialization dataWithJSONObject:context options:0 error:nil];
        NSString *contextText = contextData ? [[NSString alloc] initWithData:contextData encoding:NSUTF8StringEncoding] : @"{}";
        NSMutableString *userText = [NSMutableString stringWithFormat:@"%@\n\n[用户已授权的工作台数据]\n%@", prompt, contextText];
        NSMutableArray *content = [NSMutableArray arrayWithObject:@{ @"type": @"text", @"text": userText }];
        for (NSDictionary *attachment in attachments) {
            NSString *name = [attachment[@"name"] isKindOfClass:NSString.class] ? attachment[@"name"] : @"附件";
            NSString *textContent = [attachment[@"text"] isKindOfClass:NSString.class] ? attachment[@"text"] : nil;
            NSString *dataUrl = [attachment[@"dataUrl"] isKindOfClass:NSString.class] ? attachment[@"dataUrl"] : nil;
            if (textContent) [userText appendFormat:@"\n\n[附件：%@]\n%@", name, textContent];
            else if (dataUrl) [content addObject:@{ @"type": @"image_url", @"image_url": @{ @"url": dataUrl } }];
            else [userText appendFormat:@"\n\n[附件元数据：%@；当前版本未解析其正文]", name];
        }
        NSDictionary *userContent = content.count > 1 ? @{ @"role": @"user", @"content": content } : @{ @"role": @"user", @"content": userText };
        NSString *instructions = @"你是个人成长工作台中的成长规划AI助手。依据用户授权的数据提供准确、具体、克制的建议；区分事实、推断与建议；不进行医疗诊断；计划变更必须作为待确认草案。月末请求需同时给出月总结证据、趋势判断和下月计划草案。";
        NSDictionary *payload = usesResponsesAPI ?
            @{ @"model": model, @"instructions": instructions, @"input": userText, @"stream": @NO } :
            @{ @"model": model, @"messages": @[ @{ @"role": @"system", @"content": instructions }, userContent ], @"stream": @NO };
        NSData *payloadData = [NSJSONSerialization dataWithJSONObject:payload options:0 error:nil];
        NSString *key = [[NSString alloc] initWithData:keyData encoding:NSUTF8StringEncoding];
        NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url];
        request.HTTPMethod = @"POST"; request.HTTPBody = payloadData; request.timeoutInterval = 55.0;
        [request setValue:@"application/json" forHTTPHeaderField:@"Content-Type"];
        [request setValue:[@"Bearer " stringByAppendingString:key] forHTTPHeaderField:@"Authorization"];
        NSURLSession *session = [NSURLSession sessionWithConfiguration:NSURLSessionConfiguration.ephemeralSessionConfiguration];
        [[session dataTaskWithRequest:request completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
            NSHTTPURLResponse *http = [response isKindOfClass:NSHTTPURLResponse.class] ? (NSHTTPURLResponse *)response : nil;
            if (error || !http) { [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"network_failed" }]; return; }
            if (http.statusCode < 200 || http.statusCode >= 300) {
                NSString *code = (http.statusCode == 401 || http.statusCode == 403) ? @"authentication_failed" :
                    (http.statusCode == 402 ? @"insufficient_balance" : (http.statusCode == 429 ? @"rate_limited" : @"service_error"));
                NSDictionary *errorJSON = data ? [NSJSONSerialization JSONObjectWithData:data options:0 error:nil] : nil;
                NSDictionary *errorObject = [errorJSON[@"error"] isKindOfClass:NSDictionary.class] ? errorJSON[@"error"] : nil;
                NSString *detail = [errorObject[@"message"] isKindOfClass:NSString.class] ? errorObject[@"message"] : @"";
                NSMutableDictionary *failure = [@{ @"requestId": requestId, @"ok": @NO, @"error": code, @"status": @(http.statusCode) } mutableCopy];
                if (detail.length) failure[@"detail"] = detail;
                [self sendNativeResult:failure]; return;
            }
            NSDictionary *json = data ? [NSJSONSerialization JSONObjectWithData:data options:0 error:nil] : nil;
            NSString *answer = [json[@"output_text"] isKindOfClass:NSString.class] ? json[@"output_text"] : nil;
            if (!answer.length && usesResponsesAPI) {
                NSMutableString *combined = [NSMutableString string];
                NSArray *output = [json[@"output"] isKindOfClass:NSArray.class] ? json[@"output"] : @[];
                for (NSDictionary *item in output) {
                    if (![item[@"type"] isEqual:@"message"]) continue;
                    NSArray *parts = [item[@"content"] isKindOfClass:NSArray.class] ? item[@"content"] : @[];
                    for (NSDictionary *part in parts) {
                        if ([part[@"text"] isKindOfClass:NSString.class]) [combined appendString:part[@"text"]];
                    }
                }
                answer = combined;
            }
            if (!answer.length && !usesResponsesAPI) {
                NSArray *choices = [json[@"choices"] isKindOfClass:NSArray.class] ? json[@"choices"] : nil;
                NSDictionary *choice = choices.count ? choices[0] : nil;
                NSDictionary *message = [choice[@"message"] isKindOfClass:NSDictionary.class] ? choice[@"message"] : nil;
                answer = [message[@"content"] isKindOfClass:NSString.class] ? message[@"content"] : nil;
            }
            if (!answer.length) { [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"invalid_response" }]; return; }
            NSDictionary *providerUsage = [json[@"usage"] isKindOfClass:NSDictionary.class] ? json[@"usage"] : @{}; NSNumber *inputTokens = [providerUsage[@"input_tokens"] isKindOfClass:NSNumber.class] ? providerUsage[@"input_tokens"] : ([providerUsage[@"prompt_tokens"] isKindOfClass:NSNumber.class] ? providerUsage[@"prompt_tokens"] : @0); NSNumber *outputTokens = [providerUsage[@"output_tokens"] isKindOfClass:NSNumber.class] ? providerUsage[@"output_tokens"] : ([providerUsage[@"completion_tokens"] isKindOfClass:NSNumber.class] ? providerUsage[@"completion_tokens"] : @0);
            [self sendNativeResult:@{ @"requestId": requestId, @"ok": @YES, @"content": answer, @"status": @(http.statusCode), @"usage": @{ @"inputTokens": inputTokens, @"outputTokens": outputTokens } }];
        }] resume];
        return;
    }
    [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"unsupported_action" }];
}

- (NSString *)customIconStoragePath {
    NSArray<NSString *> *paths = NSSearchPathForDirectoriesInDomains(NSApplicationSupportDirectory, NSUserDomainMask, YES);
    NSString *base = paths.firstObject ?: [NSHomeDirectory() stringByAppendingPathComponent:@"Library/Application Support"];
    NSString *directory = [base stringByAppendingPathComponent:WorkbenchBundleIdentifier];
    [NSFileManager.defaultManager createDirectoryAtPath:directory withIntermediateDirectories:YES attributes:nil error:nil];
    return [directory stringByAppendingPathComponent:@"custom-app-icon.png"];
}

- (void)dispatchSystemEvent:(NSString *)name {
    NSString *script = [NSString stringWithFormat:@"window.dispatchEvent(new CustomEvent('%@'));", name];
    dispatch_async(dispatch_get_main_queue(), ^{ [self.webView evaluateJavaScript:script completionHandler:nil]; });
}

- (void)systemWillSleep:(NSNotification *)notification { [self dispatchSystemEvent:@"workbench-system-sleep"]; }
- (void)systemDidWake:(NSNotification *)notification { [self dispatchSystemEvent:@"workbench-system-wake"]; }

- (NSString *)applicationSupportDirectoryForIdentifier:(NSString *)identifier create:(BOOL)create {
    NSArray<NSString *> *paths = NSSearchPathForDirectoriesInDomains(NSApplicationSupportDirectory, NSUserDomainMask, YES);
    NSString *base = paths.firstObject ?: [NSHomeDirectory() stringByAppendingPathComponent:@"Library/Application Support"];
    NSString *directory = [base stringByAppendingPathComponent:identifier];
    if (create) [NSFileManager.defaultManager createDirectoryAtPath:directory withIntermediateDirectories:YES attributes:nil error:nil];
    return directory;
}

- (BOOL)copyMissingItemsFromDirectory:(NSString *)source toDirectory:(NSString *)destination error:(NSError **)error {
    BOOL isDirectory = NO;
    if (![NSFileManager.defaultManager fileExistsAtPath:source isDirectory:&isDirectory] || !isDirectory) return YES;
    if (![NSFileManager.defaultManager createDirectoryAtPath:destination withIntermediateDirectories:YES attributes:nil error:error]) return NO;
    NSArray<NSString *> *items = [NSFileManager.defaultManager contentsOfDirectoryAtPath:source error:error];
    if (!items) return NO;
    NSSet *databaseFiles = [NSSet setWithArray:@[@"workbench.sqlite3", @"workbench.sqlite3-wal", @"workbench.sqlite3-shm"]];
    for (NSString *name in items) {
        if ([databaseFiles containsObject:name]) continue;
        NSString *from = [source stringByAppendingPathComponent:name];
        NSString *to = [destination stringByAppendingPathComponent:name];
        BOOL childDirectory = NO;
        [NSFileManager.defaultManager fileExistsAtPath:from isDirectory:&childDirectory];
        if (childDirectory) {
            if (![self copyMissingItemsFromDirectory:from toDirectory:to error:error]) return NO;
        } else if (![NSFileManager.defaultManager fileExistsAtPath:to] &&
                   ![NSFileManager.defaultManager copyItemAtPath:from toPath:to error:error]) return NO;
    }
    return YES;
}

- (BOOL)copySQLiteDatabaseAtPath:(NSString *)sourcePath toPath:(NSString *)destinationPath error:(NSError **)error {
    if (![NSFileManager.defaultManager fileExistsAtPath:sourcePath] || [NSFileManager.defaultManager fileExistsAtPath:destinationPath]) return YES;
    if (![NSFileManager.defaultManager createDirectoryAtPath:destinationPath.stringByDeletingLastPathComponent withIntermediateDirectories:YES attributes:nil error:error]) return NO;
    sqlite3 *source = NULL, *destination = NULL;
    int result = sqlite3_open_v2(sourcePath.fileSystemRepresentation, &source, SQLITE_OPEN_READONLY | SQLITE_OPEN_FULLMUTEX, NULL);
    if (result == SQLITE_OK) result = sqlite3_open_v2(destinationPath.fileSystemRepresentation, &destination, SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE | SQLITE_OPEN_FULLMUTEX, NULL);
    sqlite3_backup *backup = result == SQLITE_OK ? sqlite3_backup_init(destination, "main", source, "main") : NULL;
    if (backup) result = sqlite3_backup_step(backup, -1);
    if (backup) sqlite3_backup_finish(backup);
    if (destination) sqlite3_close(destination);
    if (source) sqlite3_close(source);
    if (result == SQLITE_DONE) return YES;
    [NSFileManager.defaultManager removeItemAtPath:destinationPath error:nil];
    if (error) *error = [NSError errorWithDomain:@"GrowthWorkbenchMigration" code:result userInfo:@{NSLocalizedDescriptionKey: @"旧版 SQLite 数据迁移失败，旧数据库保持不变"}];
    return NO;
}

- (void)migrateLegacyInstallationIfNeeded {
    NSUserDefaults *defaults = NSUserDefaults.standardUserDefaults;
    NSString *marker = @"WorkbenchLegacyBundleMigrationCompleted";
    if ([defaults boolForKey:marker]) return;
    NSDictionary *legacy = [defaults persistentDomainForName:WorkbenchLegacyBundleIdentifier] ?: @{};
    NSArray<NSString *> *keys = @[WorkbenchDatabasePathPreference, WorkbenchCustomIconPathPreference,
        WorkbenchLibraryPathPreference, WorkbenchLibraryPathHistoryPreference, WorkbenchCET6PathPreference,
        WorkbenchCET6PathHistoryPreference, WorkbenchIELTSPathPreference, WorkbenchIELTSPathHistoryPreference,
        WorkbenchIELTSRecordingPathPreference, WorkbenchIELTSRecordingPathHistoryPreference, WorkbenchBackupPathPreference];
    for (NSString *key in keys) if (![defaults objectForKey:key] && legacy[key]) [defaults setObject:legacy[key] forKey:key];

    NSString *oldDirectory = [self applicationSupportDirectoryForIdentifier:WorkbenchLegacyBundleIdentifier create:NO];
    NSString *newDirectory = [self applicationSupportDirectoryForIdentifier:WorkbenchBundleIdentifier create:YES];
    NSError *migrationError = nil;
    BOOL copiedFiles = [self copyMissingItemsFromDirectory:oldDirectory toDirectory:newDirectory error:&migrationError];
    BOOL copiedDatabase = YES;
    if (![defaults stringForKey:WorkbenchDatabasePathPreference].length) {
        copiedDatabase = [self copySQLiteDatabaseAtPath:[oldDirectory stringByAppendingPathComponent:@"workbench.sqlite3"]
                                                 toPath:[newDirectory stringByAppendingPathComponent:@"workbench.sqlite3"] error:&migrationError];
    }
    if (copiedFiles && copiedDatabase) {
        [defaults setBool:YES forKey:marker];
        [defaults synchronize];
    } else {
        NSLog(@"Legacy installation migration deferred: %@", migrationError.localizedDescription ?: @"unknown error");
    }
}

- (NSInteger)numberOfPreviewItemsInPreviewPanel:(QLPreviewPanel *)panel { return self.trainingPreviewURL ? 1 : 0; }
- (id<QLPreviewItem>)previewPanel:(QLPreviewPanel *)panel previewItemAtIndex:(NSInteger)index { return self.trainingPreviewURL; }

- (NSString *)libraryStoragePath {
    NSString *configured = [NSUserDefaults.standardUserDefaults stringForKey:WorkbenchLibraryPathPreference];
    if (configured.length) return configured;
    NSString *path = [[[self customIconStoragePath] stringByDeletingLastPathComponent] stringByAppendingPathComponent:@"Library"];
    NSMutableArray *paths = [[NSUserDefaults.standardUserDefaults stringArrayForKey:WorkbenchLibraryPathHistoryPreference] mutableCopy] ?: [NSMutableArray array];
    if (![paths containsObject:path]) {
        [paths addObject:path];
        [NSUserDefaults.standardUserDefaults setObject:paths forKey:WorkbenchLibraryPathHistoryPreference];
    }
    return path;
}

- (NSSet<NSString *> *)trainingFileExtensions {
    return [NSSet setWithArray:@[@"pdf", @"png", @"jpg", @"jpeg", @"heic", @"doc", @"docx", @"mp3", @"m4a", @"wav", @"aac"]];
}

- (NSSet<NSString *> *)researchFileExtensions {
    return [NSSet setWithArray:@[@"pdf", @"png", @"jpg", @"jpeg", @"heic", @"webp", @"tiff", @"doc", @"docx", @"ppt", @"pptx", @"xls", @"xlsx", @"csv", @"txt", @"md", @"rtf", @"zip", @"bib", @"ris", @"mp3", @"m4a", @"wav", @"aac"]];
}

- (NSString *)sha256FileAtPath:(NSString *)path {
    NSInputStream *stream = [NSInputStream inputStreamWithFileAtPath:path];
    if (!stream) return @"";
    CC_SHA256_CTX context; CC_SHA256_Init(&context); [stream open];
    uint8_t buffer[65536]; NSInteger length = 0;
    while ((length = [stream read:buffer maxLength:sizeof(buffer)]) > 0) CC_SHA256_Update(&context, buffer, (CC_LONG)length);
    [stream close]; if (length < 0) return @"";
    unsigned char digest[CC_SHA256_DIGEST_LENGTH]; CC_SHA256_Final(digest, &context);
    NSMutableString *hex = [NSMutableString stringWithCapacity:CC_SHA256_DIGEST_LENGTH * 2];
    for (NSUInteger index = 0; index < CC_SHA256_DIGEST_LENGTH; index++) [hex appendFormat:@"%02x", digest[index]];
    return hex;
}

- (NSDictionary *)researchFileInfo:(NSString *)path {
    NSString *standardized = path.stringByStandardizingPath; BOOL directory = NO;
    if (!standardized.length || ![self.researchFileExtensions containsObject:standardized.pathExtension.lowercaseString] || ![NSFileManager.defaultManager fileExistsAtPath:standardized isDirectory:&directory] || directory) return nil;
    NSDictionary *attributes = [NSFileManager.defaultManager attributesOfItemAtPath:standardized error:nil];
    return @{ @"path": standardized, @"name": standardized.lastPathComponent ?: @"", @"extension": standardized.pathExtension.lowercaseString ?: @"", @"size": attributes[NSFileSize] ?: @0, @"modifiedAt": [attributes[NSFileModificationDate] description] ?: @"", @"fingerprint": [self sha256FileAtPath:standardized] ?: @"" };
}

- (NSArray *)researchFilesInDirectory:(NSString *)directory {
    NSMutableArray *files = [NSMutableArray array];
    NSDirectoryEnumerator *enumerator = [NSFileManager.defaultManager enumeratorAtURL:[NSURL fileURLWithPath:directory] includingPropertiesForKeys:@[NSURLIsRegularFileKey] options:NSDirectoryEnumerationSkipsHiddenFiles errorHandler:^BOOL(NSURL *url, NSError *error) { return YES; }];
    for (NSURL *url in enumerator) { NSDictionary *info = [self researchFileInfo:url.path]; if (info) [files addObject:info]; }
    return files;
}

- (NSString *)importResearchAssetAtPath:(NSString *)source projectId:(NSString *)projectId error:(NSError **)error {
    NSDictionary *info = [self researchFileInfo:source]; if (!info) return nil;
    NSCharacterSet *unsafe = [NSCharacterSet characterSetWithCharactersInString:@"/\\:"];
    NSString *safeId = [[projectId componentsSeparatedByCharactersInSet:unsafe] componentsJoinedByString:@"-"];
    NSString *directory = [[self libraryStoragePath] stringByAppendingPathComponent:safeId.length ? safeId : @"project"];
    if (![NSFileManager.defaultManager createDirectoryAtPath:directory withIntermediateDirectories:YES attributes:nil error:error]) return nil;
    NSString *name = info[@"name"], *destination = [directory stringByAppendingPathComponent:name];
    if ([NSFileManager.defaultManager fileExistsAtPath:destination]) {
        NSString *extension = name.pathExtension, *stem = name.stringByDeletingPathExtension;
        name = extension.length ? [NSString stringWithFormat:@"%@-%@.%@", stem, NSUUID.UUID.UUIDString.lowercaseString, extension] : [NSString stringWithFormat:@"%@-%@", stem, NSUUID.UUID.UUIDString.lowercaseString];
        destination = [directory stringByAppendingPathComponent:name];
    }
    return [NSFileManager.defaultManager copyItemAtPath:source.stringByStandardizingPath toPath:destination error:error] ? destination : nil;
}

- (NSDictionary *)migrateLibraryFilesFrom:(NSString *)oldRoot to:(NSString *)newRoot error:(NSError **)error {
    if (!oldRoot.length || !newRoot.length || [oldRoot isEqualToString:newRoot]) return @{};
    BOOL oldDirectory = NO;
    if (![NSFileManager.defaultManager fileExistsAtPath:oldRoot isDirectory:&oldDirectory] || !oldDirectory) return @{};
    if (![NSFileManager.defaultManager createDirectoryAtPath:newRoot withIntermediateDirectories:YES attributes:nil error:error]) return nil;
    NSMutableDictionary *map = [NSMutableDictionary dictionary];
    NSDirectoryEnumerator *enumerator = [NSFileManager.defaultManager enumeratorAtURL:[NSURL fileURLWithPath:oldRoot] includingPropertiesForKeys:@[NSURLIsRegularFileKey] options:NSDirectoryEnumerationSkipsHiddenFiles errorHandler:^BOOL(NSURL *url, NSError *scanError) { return YES; }];
    for (NSURL *url in enumerator) {
        NSDictionary *info = [self researchFileInfo:url.path]; if (!info) continue;
        NSString *relative = [url.path substringFromIndex:MIN(url.path.length, oldRoot.length + 1)];
        NSString *destination = [newRoot stringByAppendingPathComponent:relative];
        if (![NSFileManager.defaultManager createDirectoryAtPath:destination.stringByDeletingLastPathComponent withIntermediateDirectories:YES attributes:nil error:error]) return nil;
        if ([NSFileManager.defaultManager fileExistsAtPath:destination]) {
            if ([[self sha256FileAtPath:destination] isEqualToString:info[@"fingerprint"]]) { map[url.path.stringByStandardizingPath] = destination; continue; }
            NSString *extension = destination.pathExtension, *stem = destination.stringByDeletingPathExtension;
            destination = extension.length ? [NSString stringWithFormat:@"%@-%@.%@", stem, NSUUID.UUID.UUIDString.lowercaseString, extension] : [NSString stringWithFormat:@"%@-%@", stem, NSUUID.UUID.UUIDString.lowercaseString];
        }
        if (![NSFileManager.defaultManager copyItemAtPath:url.path toPath:destination error:error]) return nil;
        if (![[self sha256FileAtPath:destination] isEqualToString:info[@"fingerprint"]]) { if (error) *error = [NSError errorWithDomain:@"WorkbenchLibraryMigration" code:2 userInfo:@{NSLocalizedDescriptionKey: @"copied file fingerprint mismatch"}]; return nil; }
        map[url.path.stringByStandardizingPath] = destination;
    }
    return map;
}

- (NSDictionary *)trainingFileInfo:(NSString *)path {
    NSString *standardized = path.stringByStandardizingPath;
    BOOL directory = NO;
    if (!standardized.length || ![[self trainingFileExtensions] containsObject:standardized.pathExtension.lowercaseString] ||
        ![NSFileManager.defaultManager fileExistsAtPath:standardized isDirectory:&directory] || directory) return nil;
    NSDictionary *attributes = [NSFileManager.defaultManager attributesOfItemAtPath:standardized error:nil];
    return @{ @"path": standardized, @"name": standardized.lastPathComponent ?: @"", @"extension": standardized.pathExtension.lowercaseString ?: @"", @"size": attributes[NSFileSize] ?: @0 };
}

- (NSArray *)trainingFilesInDirectory:(NSString *)directory {
    NSMutableArray *files = [NSMutableArray array];
    NSDirectoryEnumerator *enumerator = [NSFileManager.defaultManager enumeratorAtURL:[NSURL fileURLWithPath:directory] includingPropertiesForKeys:@[NSURLIsRegularFileKey] options:NSDirectoryEnumerationSkipsHiddenFiles errorHandler:^BOOL(NSURL *url, NSError *error) { return YES; }];
    for (NSURL *url in enumerator) { NSDictionary *info = [self trainingFileInfo:url.path]; if (info) [files addObject:info]; }
    return files;
}

- (NSString *)cet6StoragePath {
    NSString *configured = [NSUserDefaults.standardUserDefaults stringForKey:WorkbenchCET6PathPreference];
    if (configured.length) return configured;
    NSString *path = [[[self customIconStoragePath] stringByDeletingLastPathComponent] stringByAppendingPathComponent:@"CET-6 Library"];
    NSMutableArray *paths = [[NSUserDefaults.standardUserDefaults stringArrayForKey:WorkbenchCET6PathHistoryPreference] mutableCopy] ?: [NSMutableArray array];
    if (![paths containsObject:path]) { [paths addObject:path]; [NSUserDefaults.standardUserDefaults setObject:paths forKey:WorkbenchCET6PathHistoryPreference]; }
    return path;
}

- (NSString *)importCet6AssetAtPath:(NSString *)source error:(NSError **)error {
    NSDictionary *info = [self trainingFileInfo:source];
    if (!info) return nil;
    NSString *directory = [self cet6StoragePath];
    if (![NSFileManager.defaultManager createDirectoryAtPath:directory withIntermediateDirectories:YES attributes:nil error:error]) return nil;
    NSString *name = info[@"name"];
    NSString *destination = [directory stringByAppendingPathComponent:name];
    if ([NSFileManager.defaultManager fileExistsAtPath:destination]) {
        NSString *extension = name.pathExtension;
        NSString *stem = name.stringByDeletingPathExtension;
        name = [NSString stringWithFormat:@"%@-%@.%@", stem, NSUUID.UUID.UUIDString.lowercaseString, extension];
        destination = [directory stringByAppendingPathComponent:name];
    }
    return [NSFileManager.defaultManager copyItemAtPath:source.stringByStandardizingPath toPath:destination error:error] ? destination : nil;
}

- (NSString *)ieltsStoragePath {
    NSString *configured = [NSUserDefaults.standardUserDefaults stringForKey:WorkbenchIELTSPathPreference];
    if (configured.length) return configured;
    NSString *path = [[[self customIconStoragePath] stringByDeletingLastPathComponent] stringByAppendingPathComponent:@"IELTS Library"];
    NSMutableArray *paths = [[NSUserDefaults.standardUserDefaults stringArrayForKey:WorkbenchIELTSPathHistoryPreference] mutableCopy] ?: [NSMutableArray array];
    if (![paths containsObject:path]) { [paths addObject:path]; [NSUserDefaults.standardUserDefaults setObject:paths forKey:WorkbenchIELTSPathHistoryPreference]; }
    return path;
}

- (NSString *)ieltsRecordingStoragePath {
    NSString *configured = [NSUserDefaults.standardUserDefaults stringForKey:WorkbenchIELTSRecordingPathPreference];
    if (configured.length) return configured;
    NSString *path = [[[self customIconStoragePath] stringByDeletingLastPathComponent] stringByAppendingPathComponent:@"IELTS Recordings"];
    NSMutableArray *paths = [[NSUserDefaults.standardUserDefaults stringArrayForKey:WorkbenchIELTSRecordingPathHistoryPreference] mutableCopy] ?: [NSMutableArray array];
    if (![paths containsObject:path]) { [paths addObject:path]; [NSUserDefaults.standardUserDefaults setObject:paths forKey:WorkbenchIELTSRecordingPathHistoryPreference]; }
    return path;
}

- (NSString *)importIeltsAssetAtPath:(NSString *)source error:(NSError **)error {
    NSDictionary *info = [self trainingFileInfo:source]; if (!info) return nil;
    NSString *directory = [self ieltsStoragePath];
    if (![NSFileManager.defaultManager createDirectoryAtPath:directory withIntermediateDirectories:YES attributes:nil error:error]) return nil;
    NSString *name = info[@"name"], *destination = [directory stringByAppendingPathComponent:name];
    if ([NSFileManager.defaultManager fileExistsAtPath:destination]) {
        NSString *extension = name.pathExtension, *stem = name.stringByDeletingPathExtension;
        name = [NSString stringWithFormat:@"%@-%@.%@", stem, NSUUID.UUID.UUIDString.lowercaseString, extension]; destination = [directory stringByAppendingPathComponent:name];
    }
    return [NSFileManager.defaultManager copyItemAtPath:source.stringByStandardizingPath toPath:destination error:error] ? destination : nil;
}

- (BOOL)isPath:(NSString *)path insideRecordedRootsForPreference:(NSString *)preference current:(NSString *)current {
    if (!path.length) return NO;
    NSMutableArray *roots = [[NSUserDefaults.standardUserDefaults stringArrayForKey:preference] mutableCopy] ?: [NSMutableArray array];
    if (current.length && ![roots containsObject:current]) [roots addObject:current];
    for (NSString *root in roots) if ([path hasPrefix:[root.stringByStandardizingPath stringByAppendingString:@"/"]]) return YES;
    return NO;
}

- (void)startIeltsRecordingWithMicrophoneId:(NSString *)microphoneId temporary:(BOOL)temporary completion:(void (^)(NSString *, NSError *))completion {
    void (^begin)(void) = ^{
        AVCaptureDevice *device = microphoneId.length ? [AVCaptureDevice deviceWithUniqueID:microphoneId] : [AVCaptureDevice defaultDeviceWithMediaType:AVMediaTypeAudio];
        if (!device) { completion(nil, [NSError errorWithDomain:@"IELTSRecording" code:2 userInfo:@{NSLocalizedDescriptionKey: @"未找到可用麦克风"}]); return; }
        NSError *inputError = nil; AVCaptureDeviceInput *input = [AVCaptureDeviceInput deviceInputWithDevice:device error:&inputError];
        if (!input) { completion(nil, inputError); return; }
        AVCaptureSession *session = [[AVCaptureSession alloc] init]; AVCaptureAudioFileOutput *output = [[AVCaptureAudioFileOutput alloc] init];
        if (![session canAddInput:input] || ![session canAddOutput:output]) { completion(nil, [NSError errorWithDomain:@"IELTSRecording" code:3 userInfo:@{NSLocalizedDescriptionKey: @"无法建立录音通道"}]); return; }
        [session addInput:input]; [session addOutput:output];
        NSString *directory = temporary ? NSTemporaryDirectory() : [self ieltsRecordingStoragePath];
        NSError *directoryError = nil;
        if (![NSFileManager.defaultManager createDirectoryAtPath:directory withIntermediateDirectories:YES attributes:nil error:&directoryError]) { completion(nil, directoryError); return; }
        NSString *name = [NSString stringWithFormat:@"ielts-speaking-%@.m4a", NSUUID.UUID.UUIDString.lowercaseString];
        NSString *path = [directory stringByAppendingPathComponent:name];
        self.ieltsCaptureSession = session; self.ieltsAudioFileOutput = output; self.ieltsRecordingPath = path; self.ieltsRecordingStartedAt = [NSDate date];
        [session startRunning]; [output startRecordingToOutputFileURL:[NSURL fileURLWithPath:path] recordingDelegate:self]; completion(path, nil);
    };
    AVAuthorizationStatus status = [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeAudio];
    if (status == AVAuthorizationStatusAuthorized) { begin(); return; }
    if (status == AVAuthorizationStatusDenied || status == AVAuthorizationStatusRestricted) { completion(nil, [NSError errorWithDomain:@"IELTSRecording" code:1 userInfo:@{NSLocalizedDescriptionKey: @"麦克风权限未开启"}]); return; }
    [AVCaptureDevice requestAccessForMediaType:AVMediaTypeAudio completionHandler:^(BOOL granted) { dispatch_async(dispatch_get_main_queue(), ^{ if (granted) begin(); else completion(nil, [NSError errorWithDomain:@"IELTSRecording" code:1 userInfo:@{NSLocalizedDescriptionKey: @"麦克风权限未开启"}]); }); }];
}

- (void)captureOutput:(AVCaptureFileOutput *)output didFinishRecordingToOutputFileAtURL:(NSURL *)outputFileURL fromConnections:(NSArray<AVCaptureConnection *> *)connections error:(NSError *)error {
    if (error) NSLog(@"IELTS recording finalized with error: %@", error.localizedDescription);
    self.ieltsCaptureSession = nil; self.ieltsAudioFileOutput = nil; self.ieltsRecordingStartedAt = nil;
}

- (void)extractEnglishTextAtURL:(NSURL *)url completion:(void (^)(NSString *, NSError *))completion {
    NSString *extension = url.pathExtension.lowercaseString;
    if ([extension isEqualToString:@"pdf"]) {
        PDFDocument *document = [[PDFDocument alloc] initWithURL:url];
        completion(document.string, document ? nil : [NSError errorWithDomain:@"EnglishTextExtraction" code:1 userInfo:@{NSLocalizedDescriptionKey: @"无法读取PDF"}]);
        return;
    }
    if ([@[@"txt", @"md", @"rtf", @"csv", @"doc", @"docx"] containsObject:extension]) {
        NSDictionary *attributes = nil; NSError *error = nil;
        NSAttributedString *document = [[NSAttributedString alloc] initWithURL:url options:@{} documentAttributes:&attributes error:&error];
        completion(document.string, error); return;
    }
    NSImage *image = [[NSImage alloc] initWithContentsOfURL:url];
    CGImageRef cgImage = [image CGImageForProposedRect:NULL context:nil hints:nil];
    if (!cgImage) { completion(nil, [NSError errorWithDomain:@"EnglishTextExtraction" code:2 userInfo:@{NSLocalizedDescriptionKey: @"无法读取图片"}]); return; }
    CGImageRef retainedImage = CGImageRetain(cgImage);
    VNRecognizeTextRequest *request = [[VNRecognizeTextRequest alloc] initWithCompletionHandler:^(VNRequest *request, NSError *error) {
        if (error) { completion(nil, error); return; }
        NSMutableArray<NSString *> *lines = [NSMutableArray array];
        for (VNRecognizedTextObservation *observation in request.results) {
            VNRecognizedText *candidate = [observation topCandidates:1].firstObject;
            if (candidate.string.length) [lines addObject:candidate.string];
        }
        completion([lines componentsJoinedByString:@"\n"], nil);
    }];
    request.recognitionLevel = VNRequestTextRecognitionLevelAccurate; request.recognitionLanguages = @[@"en-US", @"zh-Hans"];
    dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
        VNImageRequestHandler *handler = [[VNImageRequestHandler alloc] initWithCGImage:retainedImage options:@{}];
        NSError *error = nil; [handler performRequests:@[request] error:&error]; CGImageRelease(retainedImage); if (error) completion(nil, error);
    });
}

- (void)transcribeIeltsRecordingAtPath:(NSString *)path completion:(void (^)(NSString *, BOOL, NSError *))completion {
    NSDictionary *info = [self trainingFileInfo:path];
    if (!info || ![path.pathExtension.lowercaseString isEqualToString:@"m4a"]) { completion(nil, NO, [NSError errorWithDomain:@"IELTSTranscription" code:1 userInfo:@{NSLocalizedDescriptionKey: @"录音文件无效"}]); return; }
    void (^recognize)(void) = ^{
        SFSpeechRecognizer *recognizer = [[SFSpeechRecognizer alloc] initWithLocale:[[NSLocale alloc] initWithLocaleIdentifier:@"en-US"]];
        if (!recognizer.available) { completion(nil, NO, [NSError errorWithDomain:@"IELTSTranscription" code:2 userInfo:@{NSLocalizedDescriptionKey: @"系统英文语音识别当前不可用"}]); return; }
        SFSpeechURLRecognitionRequest *request = [[SFSpeechURLRecognitionRequest alloc] initWithURL:[NSURL fileURLWithPath:path]];
        BOOL onDevice = recognizer.supportsOnDeviceRecognition;
        if (onDevice) request.requiresOnDeviceRecognition = YES;
        __block SFSpeechRecognitionTask *task = nil;
        task = [recognizer recognitionTaskWithRequest:request resultHandler:^(SFSpeechRecognitionResult *result, NSError *error) {
            if (result.isFinal) { completion(result.bestTranscription.formattedString ?: @"", onDevice, nil); [task cancel]; }
            else if (error) { completion(nil, onDevice, error); [task cancel]; }
        }];
    };
    SFSpeechRecognizerAuthorizationStatus status = SFSpeechRecognizer.authorizationStatus;
    if (status == SFSpeechRecognizerAuthorizationStatusAuthorized) { recognize(); return; }
    if (status == SFSpeechRecognizerAuthorizationStatusDenied || status == SFSpeechRecognizerAuthorizationStatusRestricted) { completion(nil, NO, [NSError errorWithDomain:@"IELTSTranscription" code:3 userInfo:@{NSLocalizedDescriptionKey: @"语音识别权限未开启"}]); return; }
    [SFSpeechRecognizer requestAuthorization:^(SFSpeechRecognizerAuthorizationStatus newStatus) { dispatch_async(dispatch_get_main_queue(), ^{ if (newStatus == SFSpeechRecognizerAuthorizationStatusAuthorized) recognize(); else completion(nil, NO, [NSError errorWithDomain:@"IELTSTranscription" code:3 userInfo:@{NSLocalizedDescriptionKey: @"语音识别权限未开启"}]); }); }];
}

- (NSString *)importPaperPdfAtPath:(NSString *)source error:(NSError **)error {
    NSString *standardized = source.stringByStandardizingPath;
    BOOL isDirectory = NO;
    if (!standardized.length || ![standardized.pathExtension.lowercaseString isEqualToString:@"pdf"] ||
        ![NSFileManager.defaultManager fileExistsAtPath:standardized isDirectory:&isDirectory] || isDirectory) return nil;
    NSString *directory = [self libraryStoragePath];
    if (![NSFileManager.defaultManager createDirectoryAtPath:directory withIntermediateDirectories:YES attributes:nil error:error]) return nil;
    NSString *name = standardized.lastPathComponent;
    NSString *destination = [directory stringByAppendingPathComponent:name];
    if ([NSFileManager.defaultManager fileExistsAtPath:destination]) {
        NSString *stem = name.stringByDeletingPathExtension;
        name = [NSString stringWithFormat:@"%@-%@.pdf", stem, NSUUID.UUID.UUIDString.lowercaseString];
        destination = [directory stringByAppendingPathComponent:name];
    }
    return [NSFileManager.defaultManager copyItemAtPath:standardized toPath:destination error:error] ? destination : nil;
}

- (NSImage *)normalizedApplicationIcon:(NSImage *)source {
    if (!source || source.size.width <= 0 || source.size.height <= 0) return nil;
    NSImage *result = [[NSImage alloc] initWithSize:NSMakeSize(512, 512)];
    [result lockFocus];
    [[NSColor clearColor] set];
    NSRectFill(NSMakeRect(0, 0, 512, 512));
    CGFloat scale = MIN(512.0 / source.size.width, 512.0 / source.size.height);
    NSSize size = NSMakeSize(source.size.width * scale, source.size.height * scale);
    NSRect target = NSMakeRect((512.0 - size.width) / 2.0, (512.0 - size.height) / 2.0, size.width, size.height);
    [source drawInRect:target fromRect:NSZeroRect operation:NSCompositingOperationSourceOver fraction:1.0];
    [result unlockFocus];
    return result;
}

- (BOOL)saveAndApplyApplicationIcon:(NSImage *)source error:(NSError **)error {
    NSImage *icon = [self normalizedApplicationIcon:source];
    if (!icon) return NO;
    CGImageRef image = [icon CGImageForProposedRect:NULL context:nil hints:nil];
    if (!image) return NO;
    NSBitmapImageRep *representation = [[NSBitmapImageRep alloc] initWithCGImage:image];
    NSData *png = [representation representationUsingType:NSBitmapImageFileTypePNG properties:@{}];
    NSString *path = [self customIconStoragePath];
    if (!png || ![png writeToFile:path options:NSDataWritingAtomic error:error]) return NO;
    [NSUserDefaults.standardUserDefaults setObject:path forKey:WorkbenchCustomIconPathPreference];
    NSApp.applicationIconImage = icon;
    [NSWorkspace.sharedWorkspace setIcon:icon forFile:NSBundle.mainBundle.bundlePath options:0];
    return YES;
}

- (void)applySavedApplicationIcon {
    NSString *path = [NSUserDefaults.standardUserDefaults stringForKey:WorkbenchCustomIconPathPreference];
    NSImage *icon = path.length ? [[NSImage alloc] initWithContentsOfFile:path] : nil;
    if (!icon) return;
    NSApp.applicationIconImage = icon;
    [NSWorkspace.sharedWorkspace setIcon:icon forFile:NSBundle.mainBundle.bundlePath options:0];
}

- (void)chooseApplicationIconForRequestId:(NSString *)requestId {
    NSOpenPanel *panel = [NSOpenPanel openPanel];
    panel.title = @"选择工作台图标图片";
    panel.prompt = @"应用图标";
    panel.canChooseFiles = YES;
    panel.canChooseDirectories = NO;
    panel.allowsMultipleSelection = NO;
    panel.allowedFileTypes = @[@"png", @"jpg", @"jpeg", @"heic", @"tiff", @"webp"];
    [panel beginSheetModalForWindow:self.window completionHandler:^(NSModalResponse response) {
        if (response != NSModalResponseOK || !panel.URL) {
            [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"cancelled" }];
            return;
        }
        NSImage *source = [[NSImage alloc] initWithContentsOfURL:panel.URL];
        NSError *error = nil;
        BOOL saved = [self saveAndApplyApplicationIcon:source error:&error];
        [self sendNativeResult:saved ? @{ @"requestId": requestId, @"ok": @YES } :
            @{ @"requestId": requestId, @"ok": @NO, @"error": @"icon_processing_failed",
                @"detail": error.localizedDescription ?: @"invalid image" }];
    }];
}

- (NSDictionary *)keychainQueryForAccount:(NSString *)account {
    return @{
        (__bridge id)kSecClass: (__bridge id)kSecClassGenericPassword,
        (__bridge id)kSecAttrService: WorkbenchKeychainService,
        (__bridge id)kSecAttrAccount: account
    };
}

- (BOOL)saveSecretData:(NSData *)secretData account:(NSString *)account {
    NSDictionary *query = [self keychainQueryForAccount:account];
    NSDictionary *update = @{ (__bridge id)kSecValueData: secretData };
    OSStatus status = SecItemUpdate((__bridge CFDictionaryRef)query, (__bridge CFDictionaryRef)update);
    if (status == errSecItemNotFound) {
        NSMutableDictionary *attributes = [query mutableCopy];
        attributes[(__bridge id)kSecValueData] = secretData;
        attributes[(__bridge id)kSecAttrAccessible] = (__bridge id)kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly;
        status = SecItemAdd((__bridge CFDictionaryRef)attributes, NULL);
    }
    if (status == errSecParam || status == errSecNotAvailable) status = [self saveLegacyKeyData:secretData account:account];
    return status == errSecSuccess;
}

- (BOOL)deleteSecretForAccount:(NSString *)account {
    OSStatus status = SecItemDelete((__bridge CFDictionaryRef)[self keychainQueryForAccount:account]);
    OSStatus legacyStatus = [self deleteLegacyKeyForAccount:account];
    return (status == errSecSuccess || status == errSecItemNotFound) &&
        (legacyStatus == errSecSuccess || legacyStatus == errSecItemNotFound || legacyStatus == errSecNotAvailable);
}

- (NSString *)sha256Hex:(NSString *)value {
    NSData *data = [value dataUsingEncoding:NSUTF8StringEncoding];
    unsigned char digest[CC_SHA256_DIGEST_LENGTH];
    CC_SHA256(data.bytes, (CC_LONG)data.length, digest);
    NSMutableString *hex = [NSMutableString stringWithCapacity:CC_SHA256_DIGEST_LENGTH * 2];
    for (NSUInteger index = 0; index < CC_SHA256_DIGEST_LENGTH; index++) [hex appendFormat:@"%02x", digest[index]];
    return hex;
}

- (NSString *)youdaoSignatureInput:(NSString *)query {
    if (query.length <= 20) return query;
    return [NSString stringWithFormat:@"%@%lu%@", [query substringToIndex:10], (unsigned long)query.length,
        [query substringFromIndex:query.length - 10]];
}

- (NSString *)formEncoded:(NSDictionary<NSString *, NSString *> *)parameters {
    NSMutableCharacterSet *allowed = [NSCharacterSet.URLQueryAllowedCharacterSet mutableCopy];
    [allowed removeCharactersInString:@"&=+?"];
    NSMutableArray<NSString *> *pairs = [NSMutableArray array];
    for (NSString *key in parameters) {
        NSString *encodedKey = [key stringByAddingPercentEncodingWithAllowedCharacters:allowed] ?: @"";
        NSString *encodedValue = [parameters[key] stringByAddingPercentEncodingWithAllowedCharacters:allowed] ?: @"";
        [pairs addObject:[NSString stringWithFormat:@"%@=%@", encodedKey, encodedValue]];
    }
    return [pairs componentsJoinedByString:@"&"];
}

- (NSString *)safeYoudaoURLFromValue:(id)value {
    NSString *raw = nil;
    if ([value isKindOfClass:NSString.class]) raw = value;
    if ([value isKindOfClass:NSDictionary.class] && [value[@"url"] isKindOfClass:NSString.class]) raw = value[@"url"];
    NSURL *url = raw.length ? [NSURL URLWithString:raw] : nil;
    NSString *scheme = url.scheme.lowercaseString;
    NSString *host = url.host.lowercaseString;
    if ([scheme isEqualToString:@"yddict"]) return raw;
    if (([scheme isEqualToString:@"https"] || [scheme isEqualToString:@"http"]) &&
        ([host isEqualToString:@"youdao.com"] || [host hasSuffix:@".youdao.com"])) return raw;
    return nil;
}

- (void)fetchOpenDictionaryEntry:(NSString *)query completion:(void (^)(NSDictionary *entry))completion {
    NSMutableCharacterSet *allowed = [NSCharacterSet.URLPathAllowedCharacterSet mutableCopy];
    [allowed removeCharactersInString:@"/?#"];
    NSString *encoded = [query stringByAddingPercentEncodingWithAllowedCharacters:allowed];
    NSURL *url = encoded.length ? [NSURL URLWithString:[NSString stringWithFormat:
        @"https://api.dictionaryapi.dev/api/v2/entries/en/%@", encoded]] : nil;
    if (!url) { completion(nil); return; }
    NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url];
    request.timeoutInterval = 8.0;
    [request setValue:@"application/json" forHTTPHeaderField:@"Accept"];
    NSURLSession *session = [NSURLSession sessionWithConfiguration:NSURLSessionConfiguration.ephemeralSessionConfiguration];
    [[session dataTaskWithRequest:request completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
        NSHTTPURLResponse *http = [response isKindOfClass:NSHTTPURLResponse.class] ? (NSHTTPURLResponse *)response : nil;
        NSArray *json = data ? [NSJSONSerialization JSONObjectWithData:data options:0 error:nil] : nil;
        NSDictionary *source = [json isKindOfClass:NSArray.class] && json.count && [json[0] isKindOfClass:NSDictionary.class] ? json[0] : nil;
        if (error || http.statusCode != 200 || !source) { completion(nil); return; }

        NSString *phonetic = [source[@"phonetic"] isKindOfClass:NSString.class] ? source[@"phonetic"] : @"";
        NSMutableArray *phonetics = [NSMutableArray array];
        for (id item in [source[@"phonetics"] isKindOfClass:NSArray.class] ? source[@"phonetics"] : @[]) {
            if (![item isKindOfClass:NSDictionary.class] || phonetics.count >= 4) continue;
            NSString *text = [item[@"text"] isKindOfClass:NSString.class] ? item[@"text"] : @"";
            NSString *audio = [item[@"audio"] isKindOfClass:NSString.class] ? item[@"audio"] : @"";
            NSURL *audioURL = audio.length ? [NSURL URLWithString:audio] : nil;
            if (![audioURL.scheme.lowercaseString isEqualToString:@"https"] ||
                ![audioURL.host.lowercaseString isEqualToString:@"api.dictionaryapi.dev"]) audio = @"";
            if (text.length || audio.length) [phonetics addObject:@{ @"text": text, @"audio": audio }];
        }
        NSMutableArray *meanings = [NSMutableArray array];
        for (id item in [source[@"meanings"] isKindOfClass:NSArray.class] ? source[@"meanings"] : @[]) {
            if (![item isKindOfClass:NSDictionary.class] || meanings.count >= 5) continue;
            NSString *part = [item[@"partOfSpeech"] isKindOfClass:NSString.class] ? item[@"partOfSpeech"] : @"";
            NSMutableArray *definitions = [NSMutableArray array];
            for (id definitionItem in [item[@"definitions"] isKindOfClass:NSArray.class] ? item[@"definitions"] : @[]) {
                if (![definitionItem isKindOfClass:NSDictionary.class] || definitions.count >= 3) continue;
                NSString *definition = [definitionItem[@"definition"] isKindOfClass:NSString.class] ? definitionItem[@"definition"] : @"";
                NSString *example = [definitionItem[@"example"] isKindOfClass:NSString.class] ? definitionItem[@"example"] : @"";
                if (definition.length) [definitions addObject:@{ @"definition": definition, @"example": example }];
            }
            if (definitions.count) [meanings addObject:@{ @"partOfSpeech": part, @"definitions": definitions }];
        }
        completion(@{ @"phonetic": phonetic, @"phonetics": phonetics, @"meanings": meanings,
            @"source": @"Free Dictionary API" });
    }] resume];
}

- (void)performYoudaoLookup:(NSString *)query requestId:(NSString *)requestId {
    NSData *appIdData = [self keyDataForAccount:YoudaoAppIdAccount];
    NSData *secretData = [self keyDataForAccount:YoudaoAppSecretAccount];
    if (!appIdData || !secretData) {
        [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"youdao_credentials_not_found" }];
        return;
    }
    NSString *appId = [[NSString alloc] initWithData:appIdData encoding:NSUTF8StringEncoding];
    NSString *secret = [[NSString alloc] initWithData:secretData encoding:NSUTF8StringEncoding];
    NSString *salt = NSUUID.UUID.UUIDString;
    NSString *curtime = [NSString stringWithFormat:@"%.0f", NSDate.date.timeIntervalSince1970];
    NSString *signatureSource = [NSString stringWithFormat:@"%@%@%@%@%@", appId,
        [self youdaoSignatureInput:query], salt, curtime, secret];
    NSDictionary *parameters = @{ @"q": query, @"from": @"auto", @"to": @"zh-CHS", @"appKey": appId,
        @"salt": salt, @"sign": [self sha256Hex:signatureSource], @"signType": @"v3", @"curtime": curtime };
    NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:[NSURL URLWithString:@"https://openapi.youdao.com/api"]];
    request.HTTPMethod = @"POST";
    request.timeoutInterval = 15.0;
    request.HTTPBody = [[self formEncoded:parameters] dataUsingEncoding:NSUTF8StringEncoding];
    [request setValue:@"application/x-www-form-urlencoded; charset=utf-8" forHTTPHeaderField:@"Content-Type"];
    [request setValue:@"application/json" forHTTPHeaderField:@"Accept"];
    NSURLSession *session = [NSURLSession sessionWithConfiguration:NSURLSessionConfiguration.ephemeralSessionConfiguration];
    [[session dataTaskWithRequest:request completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
        NSHTTPURLResponse *http = [response isKindOfClass:NSHTTPURLResponse.class] ? (NSHTTPURLResponse *)response : nil;
        if (error || !http) {
            [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"network_failed" }];
            return;
        }
        NSDictionary *json = data ? [NSJSONSerialization JSONObjectWithData:data options:0 error:nil] : nil;
        NSString *errorCode = [json[@"errorCode"] isKindOfClass:NSString.class] ? json[@"errorCode"] : @"invalid";
        if (http.statusCode < 200 || http.statusCode >= 300 || ![errorCode isEqualToString:@"0"]) {
            [self sendNativeResult:@{ @"requestId": requestId, @"ok": @NO, @"error": @"youdao_api_error",
                @"status": @(http.statusCode), @"detail": errorCode }];
            return;
        }
        NSArray *translations = [json[@"translation"] isKindOfClass:NSArray.class] ? json[@"translation"] : @[];
        NSMutableDictionary *result = [@{ @"requestId": requestId, @"ok": @YES, @"status": @(http.statusCode),
            @"query": query, @"translations": translations } mutableCopy];
        NSDictionary *basic = [json[@"basic"] isKindOfClass:NSDictionary.class] ? json[@"basic"] : nil;
        if (basic) {
            NSArray *explains = [basic[@"explains"] isKindOfClass:NSArray.class] ? basic[@"explains"] : @[];
            result[@"basic"] = @{
                @"phonetic": [basic[@"phonetic"] isKindOfClass:NSString.class] ? basic[@"phonetic"] : @"",
                @"ukPhonetic": [basic[@"uk-phonetic"] isKindOfClass:NSString.class] ? basic[@"uk-phonetic"] : @"",
                @"usPhonetic": [basic[@"us-phonetic"] isKindOfClass:NSString.class] ? basic[@"us-phonetic"] : @"",
                @"explains": explains
            };
        }
        NSString *dictURL = [self safeYoudaoURLFromValue:json[@"dict"]];
        NSString *webURL = [self safeYoudaoURLFromValue:json[@"webdict"]];
        NSString *speakURL = [self safeYoudaoURLFromValue:json[@"speakUrl"]];
        if (dictURL) result[@"dictUrl"] = dictURL;
        if (webURL) result[@"webUrl"] = webURL;
        if (speakURL) result[@"speakUrl"] = speakURL;
        [self fetchOpenDictionaryEntry:query completion:^(NSDictionary *entry) {
            if (entry) result[@"dictionary"] = entry;
            [self sendNativeResult:result];
        }];
    }] resume];
}

- (NSString *)defaultDatabasePath {
    NSArray<NSString *> *paths = NSSearchPathForDirectoriesInDomains(NSApplicationSupportDirectory, NSUserDomainMask, YES);
    NSString *base = paths.firstObject ?: [NSHomeDirectory() stringByAppendingPathComponent:@"Library/Application Support"];
    NSString *directory = [base stringByAppendingPathComponent:WorkbenchBundleIdentifier];
    [NSFileManager.defaultManager createDirectoryAtPath:directory withIntermediateDirectories:YES attributes:nil error:nil];
    return [directory stringByAppendingPathComponent:@"workbench.sqlite3"];
}

- (NSString *)databasePath {
    NSString *configured = [NSUserDefaults.standardUserDefaults stringForKey:WorkbenchDatabasePathPreference];
    return configured.length ? configured : [self defaultDatabasePath];
}

- (sqlite3 *)openDatabaseAtPath:(NSString *)path error:(NSError **)error {
    NSString *directory = [path stringByDeletingLastPathComponent];
    if (![NSFileManager.defaultManager createDirectoryAtPath:directory withIntermediateDirectories:YES attributes:nil error:error]) return NULL;
    sqlite3 *database = NULL;
    int result = sqlite3_open_v2(path.fileSystemRepresentation, &database, SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE | SQLITE_OPEN_FULLMUTEX, NULL);
    if (result != SQLITE_OK) {
        NSString *message = database ? [NSString stringWithUTF8String:sqlite3_errmsg(database)] : @"Unable to open SQLite database";
        if (database) sqlite3_close(database);
        if (error) *error = [NSError errorWithDomain:@"GrowthWorkbenchDatabase" code:result userInfo:@{NSLocalizedDescriptionKey: message}];
        return NULL;
    }
    sqlite3_busy_timeout(database, 3000);
    const char *schema = "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL); INSERT OR IGNORE INTO metadata(key,value) VALUES('schema_version','1'); CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK(id=1), json TEXT NOT NULL, updated_at TEXT NOT NULL);";
    char *errorMessage = NULL;
    result = sqlite3_exec(database, schema, NULL, NULL, &errorMessage);
    if (result != SQLITE_OK) {
        NSString *message = errorMessage ? [NSString stringWithUTF8String:errorMessage] : @"Unable to initialize SQLite schema";
        if (errorMessage) sqlite3_free(errorMessage);
        sqlite3_close(database);
        if (error) *error = [NSError errorWithDomain:@"GrowthWorkbenchDatabase" code:result userInfo:@{NSLocalizedDescriptionKey: message}];
        return NULL;
    }
    return database;
}

- (NSDictionary *)loadWorkbenchState:(NSError **)error {
    sqlite3 *database = [self openDatabaseAtPath:[self databasePath] error:error];
    if (!database) return nil;
    sqlite3_stmt *statement = NULL;
    int result = sqlite3_prepare_v2(database, "SELECT json FROM app_state WHERE id=1", -1, &statement, NULL);
    NSDictionary *state = nil;
    if (result == SQLITE_OK && sqlite3_step(statement) == SQLITE_ROW) {
        const unsigned char *text = sqlite3_column_text(statement, 0);
        if (text) {
            NSData *data = [[NSString stringWithUTF8String:(const char *)text] dataUsingEncoding:NSUTF8StringEncoding];
            id object = [NSJSONSerialization JSONObjectWithData:data options:0 error:error];
            if ([object isKindOfClass:NSDictionary.class]) state = object;
        }
    } else if (result != SQLITE_OK && error) {
        *error = [NSError errorWithDomain:@"GrowthWorkbenchDatabase" code:result userInfo:@{NSLocalizedDescriptionKey: [NSString stringWithUTF8String:sqlite3_errmsg(database)]}];
    }
    if (statement) sqlite3_finalize(statement);
    sqlite3_close(database);
    return state;
}

- (BOOL)saveWorkbenchState:(NSDictionary *)state error:(NSError **)error {
    NSData *jsonData = [NSJSONSerialization dataWithJSONObject:state options:0 error:error];
    if (!jsonData || jsonData.length > 16 * 1024 * 1024) {
        if (jsonData && error) *error = [NSError errorWithDomain:@"GrowthWorkbenchDatabase" code:SQLITE_TOOBIG userInfo:@{NSLocalizedDescriptionKey: @"Workbench state exceeds the 16 MB safety limit"}];
        return NO;
    }
    sqlite3 *database = [self openDatabaseAtPath:[self databasePath] error:error];
    if (!database) return NO;
    sqlite3_stmt *statement = NULL;
    const char *sql = "INSERT INTO app_state(id,json,updated_at) VALUES(1,?,datetime('now')) ON CONFLICT(id) DO UPDATE SET json=excluded.json, updated_at=excluded.updated_at";
    int result = sqlite3_prepare_v2(database, sql, -1, &statement, NULL);
    if (result == SQLITE_OK) {
        sqlite3_bind_text(statement, 1, jsonData.bytes, (int)jsonData.length, SQLITE_TRANSIENT);
        result = sqlite3_step(statement);
    }
    BOOL ok = result == SQLITE_DONE;
    if (!ok && error) *error = [NSError errorWithDomain:@"GrowthWorkbenchDatabase" code:result userInfo:@{NSLocalizedDescriptionKey: [NSString stringWithUTF8String:sqlite3_errmsg(database)]}];
    if (statement) sqlite3_finalize(statement);
    sqlite3_close(database);
    return ok;
}

- (NSString *)migrateDatabaseToDirectory:(NSURL *)directoryURL error:(NSError **)error {
    NSString *sourcePath = [self databasePath];
    NSString *destinationPath = [directoryURL.path stringByAppendingPathComponent:@"个人成长工作台.sqlite3"];
    if ([sourcePath isEqualToString:destinationPath]) return sourcePath;
    if ([NSFileManager.defaultManager fileExistsAtPath:destinationPath]) {
        if (error) *error = [NSError errorWithDomain:@"GrowthWorkbenchDatabase" code:SQLITE_CANTOPEN userInfo:@{NSLocalizedDescriptionKey: @"目标文件夹已存在同名数据库，请选择其他文件夹"}];
        return nil;
    }
    sqlite3 *source = [self openDatabaseAtPath:sourcePath error:error];
    if (!source) return nil;
    sqlite3 *destination = [self openDatabaseAtPath:destinationPath error:error];
    if (!destination) { sqlite3_close(source); return nil; }
    sqlite3_backup *backup = sqlite3_backup_init(destination, "main", source, "main");
    int result = backup ? sqlite3_backup_step(backup, -1) : sqlite3_errcode(destination);
    if (backup) sqlite3_backup_finish(backup);
    sqlite3_close(destination);
    sqlite3_close(source);
    if (result != SQLITE_DONE) {
        [NSFileManager.defaultManager removeItemAtPath:destinationPath error:nil];
        if (error) *error = [NSError errorWithDomain:@"GrowthWorkbenchDatabase" code:result userInfo:@{NSLocalizedDescriptionKey: @"SQLite 数据迁移未完成"}];
        return nil;
    }
    [NSUserDefaults.standardUserDefaults setObject:destinationPath forKey:WorkbenchDatabasePathPreference];
    return destinationPath;
}

- (BOOL)hasPersistedKeyForAccount:(NSString *)account {
    NSMutableDictionary *query = [[self keychainQueryForAccount:account] mutableCopy];
    query[(__bridge id)kSecReturnData] = @NO;
    query[(__bridge id)kSecMatchLimit] = (__bridge id)kSecMatchLimitOne;
    OSStatus status = SecItemCopyMatching((__bridge CFDictionaryRef)query, NULL);
    if (status == errSecSuccess) return YES;
    return [self legacyKeyDataForAccount:account] != nil;
}

- (NSData *)keyDataForAccount:(NSString *)account {
    NSMutableDictionary *query = [[self keychainQueryForAccount:account] mutableCopy];
    query[(__bridge id)kSecReturnData] = @YES;
    query[(__bridge id)kSecMatchLimit] = (__bridge id)kSecMatchLimitOne;
    CFTypeRef result = NULL;
    OSStatus status = SecItemCopyMatching((__bridge CFDictionaryRef)query, &result);
    if (status != errSecSuccess || !result) {
        NSData *legacy = [self legacyKeyDataForAccount:account];
        if (legacy) [self saveSecretData:legacy account:account];
        return legacy ?: self.sessionAiKeys[account];
    }
    return CFBridgingRelease(result);
}

- (SecKeychainRef)copyLoginKeychain {
    NSString *path = [NSHomeDirectory() stringByAppendingPathComponent:@"Library/Keychains/login.keychain-db"];
    SecKeychainRef keychain = NULL;
    return SecKeychainOpen(path.fileSystemRepresentation, &keychain) == errSecSuccess ? keychain : NULL;
}

- (NSData *)legacyKeyDataForAccount:(NSString *)account {
    SecKeychainRef keychain = [self copyLoginKeychain];
    if (!keychain) return nil;
    NSData *service = [WorkbenchLegacyKeychainService dataUsingEncoding:NSUTF8StringEncoding];
    NSData *accountData = [account dataUsingEncoding:NSUTF8StringEncoding];
    UInt32 length = 0;
    void *bytes = NULL;
    OSStatus status = SecKeychainFindGenericPassword(keychain, (UInt32)service.length, service.bytes,
        (UInt32)accountData.length, accountData.bytes, &length, &bytes, NULL);
    NSData *result = status == errSecSuccess && bytes ? [NSData dataWithBytes:bytes length:length] : nil;
    if (bytes) SecKeychainItemFreeContent(NULL, bytes);
    CFRelease(keychain);
    return result;
}

- (OSStatus)saveLegacyKeyData:(NSData *)keyData account:(NSString *)account {
    SecKeychainRef keychain = [self copyLoginKeychain];
    if (!keychain) return errSecNotAvailable;
    NSData *service = [WorkbenchKeychainService dataUsingEncoding:NSUTF8StringEncoding];
    NSData *accountData = [account dataUsingEncoding:NSUTF8StringEncoding];
    SecKeychainItemRef item = NULL;
    OSStatus status = SecKeychainFindGenericPassword(keychain, (UInt32)service.length, service.bytes,
        (UInt32)accountData.length, accountData.bytes, NULL, NULL, &item);
    if (status == errSecSuccess && item) {
        status = SecKeychainItemModifyAttributesAndData(item, NULL, (UInt32)keyData.length, keyData.bytes);
    } else if (status == errSecItemNotFound) {
        status = SecKeychainAddGenericPassword(keychain, (UInt32)service.length, service.bytes,
            (UInt32)accountData.length, accountData.bytes, (UInt32)keyData.length, keyData.bytes, &item);
    }
    if (item) CFRelease(item);
    CFRelease(keychain);
    return status;
}

- (OSStatus)deleteLegacyKeyForAccount:(NSString *)account {
    SecKeychainRef keychain = [self copyLoginKeychain];
    if (!keychain) return errSecNotAvailable;
    NSData *service = [WorkbenchLegacyKeychainService dataUsingEncoding:NSUTF8StringEncoding];
    NSData *accountData = [account dataUsingEncoding:NSUTF8StringEncoding];
    SecKeychainItemRef item = NULL;
    OSStatus status = SecKeychainFindGenericPassword(keychain, (UInt32)service.length, service.bytes,
        (UInt32)accountData.length, accountData.bytes, NULL, NULL, &item);
    if (status == errSecSuccess && item) status = SecKeychainItemDelete(item);
    if (item) CFRelease(item);
    CFRelease(keychain);
    return status;
}

- (BOOL)runTool:(NSString *)path arguments:(NSArray<NSString *> *)arguments environment:(NSDictionary<NSString *, NSString *> *)environment error:(NSError **)error {
    NSTask *task = [[NSTask alloc] init]; task.executableURL = [NSURL fileURLWithPath:path]; task.arguments = arguments; if (environment) { NSMutableDictionary *merged = [NSProcessInfo.processInfo.environment mutableCopy]; [merged addEntriesFromDictionary:environment]; task.environment = merged; }
    NSPipe *pipe = [NSPipe pipe]; task.standardError = pipe; @try { [task launchAndReturnError:error]; [task waitUntilExit]; } @catch (NSException *exception) { if (error) *error = [NSError errorWithDomain:@"GrowthWorkbenchBackup" code:1 userInfo:@{NSLocalizedDescriptionKey: exception.reason ?: @"无法启动系统备份工具"}]; return NO; }
    if (task.terminationStatus == 0) return YES; NSData *data = [pipe.fileHandleForReading readDataToEndOfFile]; NSString *message = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding]; if (error) *error = [NSError errorWithDomain:@"GrowthWorkbenchBackup" code:task.terminationStatus userInfo:@{NSLocalizedDescriptionKey: message.length ? message : @"系统备份工具执行失败"}]; return NO;
}

- (BOOL)snapshotDatabaseToPath:(NSString *)destinationPath error:(NSError **)error {
    sqlite3 *source = [self openDatabaseAtPath:[self databasePath] error:error]; if (!source) return NO; [NSFileManager.defaultManager removeItemAtPath:destinationPath error:nil]; sqlite3 *destination = NULL; int result = sqlite3_open(destinationPath.fileSystemRepresentation, &destination); if (result == SQLITE_OK) { sqlite3_backup *backup = sqlite3_backup_init(destination, "main", source, "main"); result = backup ? sqlite3_backup_step(backup, -1) : sqlite3_errcode(destination); if (backup) sqlite3_backup_finish(backup); } if (destination) sqlite3_close(destination); sqlite3_close(source); if (result == SQLITE_DONE) return YES; [NSFileManager.defaultManager removeItemAtPath:destinationPath error:nil]; if (error) *error = [NSError errorWithDomain:@"GrowthWorkbenchBackup" code:result userInfo:@{NSLocalizedDescriptionKey: @"无法创建一致的 SQLite 快照"}]; return NO;
}

- (NSDictionary *)createEncryptedBackupInDirectory:(NSString *)directory password:(NSString *)password error:(NSError **)error {
    if (!directory.length || password.length < 8) { if (error) *error = [NSError errorWithDomain:@"GrowthWorkbenchBackup" code:2 userInfo:@{NSLocalizedDescriptionKey: @"请先选择备份目录，并使用至少8位密码"}]; return nil; }
    NSString *root = [NSTemporaryDirectory() stringByAppendingPathComponent:[@"gwb-backup-" stringByAppendingString:NSUUID.UUID.UUIDString]]; NSString *payload = [root stringByAppendingPathComponent:@"payload"]; NSString *resources = [payload stringByAppendingPathComponent:@"managed-files"]; [NSFileManager.defaultManager createDirectoryAtPath:resources withIntermediateDirectories:YES attributes:nil error:error];
    NSString *database = [payload stringByAppendingPathComponent:@"workbench.sqlite3"]; if (![self snapshotDatabaseToPath:database error:error]) { [NSFileManager.defaultManager removeItemAtPath:root error:nil]; return nil; }
    NSArray *managed = @[[self libraryStoragePath] ?: @"", [self cet6StoragePath] ?: @"", [self ieltsStoragePath] ?: @"", [self ieltsRecordingStoragePath] ?: @""]; NSMutableArray *included = [NSMutableArray array]; NSInteger index = 0; for (NSString *source in managed) { if (!source.length || ![NSFileManager.defaultManager fileExistsAtPath:source]) { index++; continue; } NSString *name = [NSString stringWithFormat:@"%ld-%@", (long)index++, source.lastPathComponent ?: @"files"]; NSString *target = [resources stringByAppendingPathComponent:name]; if ([NSFileManager.defaultManager copyItemAtPath:source toPath:target error:nil]) [included addObject:@{ @"originalPath": source, @"backupFolder": name }]; }
    NSISO8601DateFormatter *isoFormatter = [[NSISO8601DateFormatter alloc] init]; NSString *createdAt = [isoFormatter stringFromDate:NSDate.date]; NSDictionary *manifest = @{ @"format": @"personal-growth-workbench-backup", @"version": @1, @"createdAt": createdAt, @"appVersion": NSBundle.mainBundle.infoDictionary[@"CFBundleShortVersionString"] ?: @"", @"database": @"workbench.sqlite3", @"managedFiles": included }; NSData *manifestData = [NSJSONSerialization dataWithJSONObject:manifest options:NSJSONWritingPrettyPrinted error:error]; if (![manifestData writeToFile:[payload stringByAppendingPathComponent:@"manifest.json"] options:NSDataWritingAtomic error:error]) { [NSFileManager.defaultManager removeItemAtPath:root error:nil]; return nil; }
    NSString *zip = [root stringByAppendingPathComponent:@"payload.zip"]; if (![self runTool:@"/usr/bin/ditto" arguments:@[@"-c", @"-k", @"--sequesterRsrc", payload, zip] environment:nil error:error]) { [NSFileManager.defaultManager removeItemAtPath:root error:nil]; return nil; }
    NSDateFormatter *formatter = [[NSDateFormatter alloc] init]; formatter.dateFormat = @"yyyyMMdd-HHmmss"; NSString *output = [directory stringByAppendingPathComponent:[NSString stringWithFormat:@"个人成长工作台-%@.gwbbackup", [formatter stringFromDate:NSDate.date]]]; BOOL encrypted = [self runTool:@"/usr/bin/openssl" arguments:@[@"enc", @"-aes-256-cbc", @"-salt", @"-pbkdf2", @"-iter", @"200000", @"-in", zip, @"-out", output, @"-pass", @"env:GWB_BACKUP_PASSWORD"] environment:@{ @"GWB_BACKUP_PASSWORD": password } error:error]; [NSFileManager.defaultManager removeItemAtPath:root error:nil]; if (!encrypted) { [NSFileManager.defaultManager removeItemAtPath:output error:nil]; return nil; } NSDictionary *attributes = [NSFileManager.defaultManager attributesOfItemAtPath:output error:nil]; return @{ @"path": output, @"bytes": attributes[NSFileSize] ?: @0, @"createdAt": createdAt };
}

- (NSDictionary *)inspectEncryptedBackup:(NSString *)path password:(NSString *)password error:(NSError **)error {
    if (password.length < 8) { if (error) *error = [NSError errorWithDomain:@"GrowthWorkbenchBackup" code:3 userInfo:@{NSLocalizedDescriptionKey: @"请输入创建备份时使用的密码"}]; return nil; }
    if (self.pendingRestoreDirectory.length) [NSFileManager.defaultManager removeItemAtPath:self.pendingRestoreDirectory error:nil]; self.pendingRestoreDirectory = nil; self.pendingRestorePayloadDirectory = nil; self.pendingRestoreManifest = nil; NSString *root = [NSTemporaryDirectory() stringByAppendingPathComponent:[@"gwb-restore-" stringByAppendingString:NSUUID.UUID.UUIDString]]; [NSFileManager.defaultManager createDirectoryAtPath:root withIntermediateDirectories:YES attributes:nil error:error]; NSString *zip = [root stringByAppendingPathComponent:@"payload.zip"];
    if (![self runTool:@"/usr/bin/openssl" arguments:@[@"enc", @"-d", @"-aes-256-cbc", @"-pbkdf2", @"-iter", @"200000", @"-in", path, @"-out", zip, @"-pass", @"env:GWB_BACKUP_PASSWORD"] environment:@{ @"GWB_BACKUP_PASSWORD": password } error:error] || ![self runTool:@"/usr/bin/ditto" arguments:@[@"-x", @"-k", zip, root] environment:nil error:error]) { [NSFileManager.defaultManager removeItemAtPath:root error:nil]; return nil; }
    NSArray<NSString *> *payloadCandidates = @[[root stringByAppendingPathComponent:@"payload"], root]; NSString *payload = nil; NSDictionary *manifest = nil; for (NSString *candidate in payloadCandidates) { NSData *data = [NSData dataWithContentsOfFile:[candidate stringByAppendingPathComponent:@"manifest.json"]]; NSDictionary *candidateManifest = data ? [NSJSONSerialization JSONObjectWithData:data options:0 error:nil] : nil; if ([candidateManifest[@"format"] isEqualToString:@"personal-growth-workbench-backup"] && [NSFileManager.defaultManager fileExistsAtPath:[candidate stringByAppendingPathComponent:@"workbench.sqlite3"]]) { payload = candidate; manifest = candidateManifest; break; } } if (!manifest) { [NSFileManager.defaultManager removeItemAtPath:root error:nil]; if (error) *error = [NSError errorWithDomain:@"GrowthWorkbenchBackup" code:4 userInfo:@{NSLocalizedDescriptionKey: @"备份格式或完整性校验失败"}]; return nil; } self.pendingRestoreDirectory = root; self.pendingRestorePayloadDirectory = payload; self.pendingRestoreManifest = manifest; return manifest;
}

- (BOOL)restoreManagedFilesFromPendingBackup:(NSError **)error {
    NSArray *entries = [self.pendingRestoreManifest[@"managedFiles"] isKindOfClass:NSArray.class] ? self.pendingRestoreManifest[@"managedFiles"] : @[];
    NSArray *destinations = @[[self libraryStoragePath] ?: @"", [self cet6StoragePath] ?: @"", [self ieltsStoragePath] ?: @"", [self ieltsRecordingStoragePath] ?: @""];
    NSString *managedRoot = [self.pendingRestorePayloadDirectory stringByAppendingPathComponent:@"managed-files"];
    for (NSDictionary *entry in entries) {
        if (![entry isKindOfClass:NSDictionary.class]) continue;
        NSString *folder = [entry[@"backupFolder"] isKindOfClass:NSString.class] ? entry[@"backupFolder"] : @""; NSArray *parts = [folder componentsSeparatedByString:@"-"]; NSInteger index = parts.count ? [parts[0] integerValue] : NSNotFound;
        if (!folder.length || ![folder.lastPathComponent isEqualToString:folder] || index < 0 || index >= (NSInteger)destinations.count) continue;
        NSString *source = [managedRoot stringByAppendingPathComponent:folder]; NSString *destination = destinations[index]; BOOL isDirectory = NO; if (!destination.length || ![NSFileManager.defaultManager fileExistsAtPath:source isDirectory:&isDirectory] || !isDirectory) continue;
        if (![NSFileManager.defaultManager createDirectoryAtPath:destination withIntermediateDirectories:YES attributes:nil error:error]) return NO;
        for (NSString *name in [NSFileManager.defaultManager contentsOfDirectoryAtPath:source error:error] ?: @[]) {
            NSString *sourceItem = [source stringByAppendingPathComponent:name]; NSString *target = [destination stringByAppendingPathComponent:name];
            if ([NSFileManager.defaultManager fileExistsAtPath:target]) { NSString *extension = name.pathExtension; NSString *stem = name.stringByDeletingPathExtension; NSString *suffix = [NSString stringWithFormat:@"%@-已恢复-%@", stem, NSUUID.UUID.UUIDString.lowercaseString]; target = [destination stringByAppendingPathComponent:extension.length ? [suffix stringByAppendingPathExtension:extension] : suffix]; }
            if (![NSFileManager.defaultManager copyItemAtPath:sourceItem toPath:target error:error]) return NO;
        }
    }
    return YES;
}

- (NSDictionary *)applyInspectedBackup:(NSError **)error {
    if (!self.pendingRestoreDirectory.length || !self.pendingRestorePayloadDirectory.length) { if (error) *error = [NSError errorWithDomain:@"GrowthWorkbenchBackup" code:5 userInfo:@{NSLocalizedDescriptionKey: @"没有已检查的待恢复备份"}]; return nil; } NSString *source = [self.pendingRestorePayloadDirectory stringByAppendingPathComponent:@"workbench.sqlite3"]; NSString *current = [self databasePath]; NSString *snapshot = [current stringByAppendingFormat:@".pre-restore-%lld", (long long)NSDate.date.timeIntervalSince1970]; if (![self snapshotDatabaseToPath:snapshot error:error]) return nil; [NSFileManager.defaultManager removeItemAtPath:current error:nil]; if (![NSFileManager.defaultManager copyItemAtPath:source toPath:current error:error]) { [NSFileManager.defaultManager copyItemAtPath:snapshot toPath:current error:nil]; return nil; } if (![self restoreManagedFilesFromPendingBackup:error]) { [NSFileManager.defaultManager removeItemAtPath:current error:nil]; [NSFileManager.defaultManager copyItemAtPath:snapshot toPath:current error:nil]; return nil; } NSDictionary *state = [self loadWorkbenchState:error]; [NSFileManager.defaultManager removeItemAtPath:self.pendingRestoreDirectory error:nil]; self.pendingRestoreDirectory = nil; self.pendingRestorePayloadDirectory = nil; self.pendingRestoreManifest = nil; return state;
}

- (void)scheduleReviewReminders:(NSDictionary *)settings {
    UNUserNotificationCenter *center = UNUserNotificationCenter.currentNotificationCenter;
    NSMutableArray<NSString *> *identifiers = [NSMutableArray array]; for (NSInteger day = 0; day < 7; day++) [identifiers addObject:[NSString stringWithFormat:@"review.weekday.%ld", (long)day]];
    [center removePendingNotificationRequestsWithIdentifiers:identifiers];
    NSDictionary *categories = [settings[@"categories"] isKindOfClass:NSDictionary.class] ? settings[@"categories"] : @{}; NSDictionary *review = [categories[@"review"] isKindOfClass:NSDictionary.class] ? categories[@"review"] : @{}; if (review[@"enabled"] && ![review[@"enabled"] boolValue]) return;
    NSDictionary *times = [settings[@"reviewByWeekday"] isKindOfClass:NSDictionary.class] ? settings[@"reviewByWeekday"] : @{}; NSString *globalSound = [settings[@"globalSound"] isKindOfClass:NSString.class] ? settings[@"globalSound"] : @"Glass"; NSString *sound = [review[@"sound"] isKindOfClass:NSString.class] ? review[@"sound"] : @"global"; if ([sound isEqualToString:@"global"]) sound = globalSound;
    for (NSInteger day = 0; day < 7; day++) {
        NSString *time = [times[[NSString stringWithFormat:@"%ld", (long)day]] isKindOfClass:NSString.class] ? times[[NSString stringWithFormat:@"%ld", (long)day]] : @"22:30"; NSArray *parts = [time componentsSeparatedByString:@":"]; if (parts.count != 2) continue;
        NSDateComponents *components = [[NSDateComponents alloc] init]; components.weekday = day + 1; components.hour = [parts[0] integerValue]; components.minute = [parts[1] integerValue];
        UNMutableNotificationContent *content = [[UNMutableNotificationContent alloc] init]; content.title = @"健康记录提醒"; content.body = @"今天的记录可以整理了。"; content.categoryIdentifier = @"review.reminder"; content.threadIdentifier = @"daily-review"; content.userInfo = @{ @"route": @"review" }; if (![sound isEqualToString:@"silent"]) content.sound = [UNNotificationSound soundNamed:sound];
        UNCalendarNotificationTrigger *trigger = [UNCalendarNotificationTrigger triggerWithDateMatchingComponents:components repeats:YES]; UNNotificationRequest *request = [UNNotificationRequest requestWithIdentifier:[NSString stringWithFormat:@"review.weekday.%ld", (long)day] content:content trigger:trigger]; [center addNotificationRequest:request withCompletionHandler:nil];
    }
}

- (void)routeReviewNotificationAction:(NSString *)action {
    NSString *safe = [action stringByReplacingOccurrencesOfString:@"'" withString:@""]; NSString *script = [NSString stringWithFormat:@"window.dispatchEvent(new CustomEvent('workbench-review-notification',{detail:{action:'%@'}}));", safe]; dispatch_async(dispatch_get_main_queue(), ^{ [NSApp activateIgnoringOtherApps:YES]; [self.window makeKeyAndOrderFront:nil]; [self.webView evaluateJavaScript:script completionHandler:nil]; });
}

- (void)userNotificationCenter:(UNUserNotificationCenter *)center didReceiveNotificationResponse:(UNNotificationResponse *)response withCompletionHandler:(void (^)(void))completionHandler {
    NSString *action = response.actionIdentifier;
    if ([action isEqualToString:@"review.snooze15"]) {
        UNMutableNotificationContent *content = [response.notification.request.content mutableCopy]; UNTimeIntervalNotificationTrigger *trigger = [UNTimeIntervalNotificationTrigger triggerWithTimeInterval:900 repeats:NO]; [center addNotificationRequest:[UNNotificationRequest requestWithIdentifier:@"review.snooze.current" content:content trigger:trigger] withCompletionHandler:nil];
    } else if ([action isEqualToString:@"review.skipToday"]) { [self routeReviewNotificationAction:@"skipToday"]; }
    else { [center removeDeliveredNotificationsWithIdentifiers:@[response.notification.request.identifier]]; [self routeReviewNotificationAction:@"open"]; }
    completionHandler();
}

- (void)userNotificationCenter:(UNUserNotificationCenter *)center willPresentNotification:(UNNotification *)notification withCompletionHandler:(void (^)(UNNotificationPresentationOptions))completionHandler { completionHandler(UNNotificationPresentationOptionBanner | UNNotificationPresentationOptionSound); }

- (NSURL *)modelsURLForBaseURL:(NSString *)baseUrl provider:(NSString *)provider {
    NSString *trimmed = [baseUrl stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceAndNewlineCharacterSet];
    while ([trimmed hasSuffix:@"/"]) trimmed = [trimmed substringToIndex:trimmed.length - 1];
    NSString *path = [provider isEqualToString:@"DeepSeek官方API"] ? @"/models" :
        ([trimmed.lowercaseString hasSuffix:@"/v1"] ? @"/models" : @"/v1/models");
    return [NSURL URLWithString:[trimmed stringByAppendingString:path]];
}

- (void)sendNativeResult:(NSDictionary *)result {
    if (![NSJSONSerialization isValidJSONObject:result]) return;
    NSData *data = [NSJSONSerialization dataWithJSONObject:result options:0 error:nil];
    NSString *json = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
    if (!json) return;
    NSString *script = [NSString stringWithFormat:@"window.workbenchNativeResult(%@)", json];
    dispatch_async(dispatch_get_main_queue(), ^{ [self.webView evaluateJavaScript:script completionHandler:nil]; });
}

- (void)webView:(WKWebView *)webView
    decidePolicyForNavigationAction:(WKNavigationAction *)navigationAction
                    decisionHandler:(void (^)(WKNavigationActionPolicy))decisionHandler {
    NSURL *url = navigationAction.request.URL;
    NSString *scheme = url.scheme.lowercaseString;
    if (scheme && ![@[@"file", @"about", @"data"] containsObject:scheme]) {
        [NSWorkspace.sharedWorkspace openURL:url];
        decisionHandler(WKNavigationActionPolicyCancel);
        return;
    }
    decisionHandler(WKNavigationActionPolicyAllow);
}

- (void)configureMenus {
    NSMenu *mainMenu = [[NSMenu alloc] init];
    NSMenuItem *appItem = [[NSMenuItem alloc] init];
    NSMenuItem *editItem = [[NSMenuItem alloc] initWithTitle:@"编辑" action:nil keyEquivalent:@""];
    [mainMenu addItem:appItem];
    [mainMenu addItem:editItem];

    NSMenu *appMenu = [[NSMenu alloc] init];
    [appMenu addItemWithTitle:@"关于个人成长工作台"
                       action:@selector(orderFrontStandardAboutPanel:)
                keyEquivalent:@""];
    [appMenu addItem:NSMenuItem.separatorItem];
    [appMenu addItemWithTitle:@"退出个人成长工作台"
                       action:@selector(terminate:)
                keyEquivalent:@"q"];
    appItem.submenu = appMenu;

    NSMenu *editMenu = [[NSMenu alloc] initWithTitle:@"编辑"];
    [editMenu addItemWithTitle:@"撤销" action:@selector(undo:) keyEquivalent:@"z"];
    [editMenu addItemWithTitle:@"重做" action:@selector(redo:) keyEquivalent:@"Z"];
    [editMenu addItem:NSMenuItem.separatorItem];
    [editMenu addItemWithTitle:@"剪切" action:@selector(cut:) keyEquivalent:@"x"];
    [editMenu addItemWithTitle:@"复制" action:@selector(copy:) keyEquivalent:@"c"];
    [editMenu addItemWithTitle:@"粘贴" action:@selector(paste:) keyEquivalent:@"v"];
    [editMenu addItemWithTitle:@"全选" action:@selector(selectAll:) keyEquivalent:@"a"];
    editItem.submenu = editMenu;
    NSApp.mainMenu = mainMenu;
}

- (void)showLoadError:(NSString *)message {
    NSAlert *alert = [[NSAlert alloc] init];
    alert.messageText = @"工作台加载失败";
    alert.informativeText = message;
    alert.alertStyle = NSAlertStyleCritical;
    [alert runModal];
}

@end

static NSDictionary *WorkbenchSynchronousJSONRequest(NSMutableURLRequest *request, NSInteger *status, NSString **failure) {
    dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);
    __block NSDictionary *result = nil; __block NSInteger responseStatus = 0; __block NSString *requestFailure = nil;
    NSURLSessionConfiguration *configuration = NSURLSessionConfiguration.ephemeralSessionConfiguration;
    configuration.timeoutIntervalForRequest = 30; configuration.timeoutIntervalForResource = 45;
    [[[NSURLSession sessionWithConfiguration:configuration] dataTaskWithRequest:request completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
        NSHTTPURLResponse *http = [response isKindOfClass:NSHTTPURLResponse.class] ? (NSHTTPURLResponse *)response : nil;
        responseStatus = http.statusCode;
        if (error) requestFailure = error.localizedDescription;
        else if (data) {
            id json = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
            if ([json isKindOfClass:NSDictionary.class]) result = json;
            else requestFailure = @"invalid JSON response";
        }
        dispatch_semaphore_signal(semaphore);
    }] resume];
    if (dispatch_semaphore_wait(semaphore, dispatch_time(DISPATCH_TIME_NOW, 50 * NSEC_PER_SEC)) != 0) requestFailure = @"request timeout";
    if (status) *status = responseStatus; if (failure) *failure = requestFailure;
    return result;
}

static int RunRecommendationAISelfTest(void) {
    WorkbenchAppDelegate *delegate = [[WorkbenchAppDelegate alloc] init];
    NSError *stateError = nil; NSDictionary *state = [delegate loadWorkbenchState:&stateError];
    NSDictionary *settings = [state[@"settings"] isKindOfClass:NSDictionary.class] ? state[@"settings"] : @{};
    NSString *account = [settings[@"aiProfile"] isKindOfClass:NSString.class] ? settings[@"aiProfile"] : @"";
    NSString *baseURL = [settings[@"aiBaseUrl"] isKindOfClass:NSString.class] ? settings[@"aiBaseUrl"] : @"";
    NSString *configuredModel = [settings[@"aiModel"] isKindOfClass:NSString.class] ? settings[@"aiModel"] : @"";
    NSData *keyData = account.length ? [delegate keyDataForAccount:account] : nil;
    if (!state || !keyData || !baseURL.length) { fprintf(stderr, "Recommendation AI self-test failed: configuration or Keychain key missing.\n"); return 2; }
    NSString *key = [[NSString alloc] initWithData:keyData encoding:NSUTF8StringEncoding];
    while ([baseURL hasSuffix:@"/"]) baseURL = [baseURL substringToIndex:baseURL.length - 1];
    NSMutableURLRequest *modelsRequest = [NSMutableURLRequest requestWithURL:[NSURL URLWithString:[baseURL stringByAppendingString:@"/models"]]];
    modelsRequest.HTTPMethod = @"GET"; [modelsRequest setValue:[@"Bearer " stringByAppendingString:key] forHTTPHeaderField:@"Authorization"];
    NSInteger status = 0; NSString *failure = nil; NSDictionary *modelsJSON = WorkbenchSynchronousJSONRequest(modelsRequest, &status, &failure);
    NSArray *models = [modelsJSON[@"data"] isKindOfClass:NSArray.class] ? modelsJSON[@"data"] : @[];
    NSMutableArray *ids = [NSMutableArray array]; for (NSDictionary *entry in models) if ([entry[@"id"] isKindOfClass:NSString.class]) [ids addObject:entry[@"id"]];
    if (status < 200 || status >= 300 || !ids.count) { fprintf(stderr, "Recommendation AI self-test failed: model discovery HTTP %ld (%s).\n", (long)status, (failure ?: @"no models").UTF8String); return 3; }
    NSString *model = [ids containsObject:configuredModel] ? configuredModel : ([ids containsObject:@"deepseek-chat"] ? @"deepseek-chat" : ids.firstObject);
    NSDictionary *payload = @{ @"model": model, @"messages": @[ @{ @"role": @"system", @"content": @"You are a restricted recommendation pipeline connectivity test." }, @{ @"role": @"user", @"content": @"Reply with exactly RECOMMENDATION_AI_OK" } ], @"stream": @NO, @"max_tokens": @20 };
    NSMutableURLRequest *chatRequest = [NSMutableURLRequest requestWithURL:[NSURL URLWithString:[baseURL stringByAppendingString:@"/chat/completions"]]];
    chatRequest.HTTPMethod = @"POST"; chatRequest.HTTPBody = [NSJSONSerialization dataWithJSONObject:payload options:0 error:nil];
    [chatRequest setValue:@"application/json" forHTTPHeaderField:@"Content-Type"]; [chatRequest setValue:[@"Bearer " stringByAppendingString:key] forHTTPHeaderField:@"Authorization"];
    NSDictionary *chatJSON = WorkbenchSynchronousJSONRequest(chatRequest, &status, &failure);
    NSArray *choices = [chatJSON[@"choices"] isKindOfClass:NSArray.class] ? chatJSON[@"choices"] : @[];
    NSDictionary *message = choices.count && [choices[0][@"message"] isKindOfClass:NSDictionary.class] ? choices[0][@"message"] : @{};
    NSString *content = [message[@"content"] isKindOfClass:NSString.class] ? message[@"content"] : @"";
    if (status < 200 || status >= 300 || [content rangeOfString:@"RECOMMENDATION_AI_OK"].location == NSNotFound) { fprintf(stderr, "Recommendation AI self-test failed: generation HTTP %ld (%s).\n", (long)status, (failure ?: @"unexpected response").UTF8String); return 4; }
    printf("PASS: DeepSeek recommendation generation verified with model %s; configured model %s.\n", model.UTF8String, configuredModel.UTF8String);
    return 0;
}

int main(int argc, const char *argv[]) {
    @autoreleasepool {
        if (argc == 2 && strcmp(argv[1], "--database-self-test") == 0) {
            WorkbenchAppDelegate *databaseDelegate = [[WorkbenchAppDelegate alloc] init];
            NSString *originalPath = [NSUserDefaults.standardUserDefaults stringForKey:WorkbenchDatabasePathPreference];
            NSString *testRoot = [NSTemporaryDirectory() stringByAppendingPathComponent:[@"growth-workbench-sqlite-test-" stringByAppendingString:NSUUID.UUID.UUIDString]];
            NSString *testPath = [testRoot stringByAppendingPathComponent:@"source.sqlite3"];
            [NSUserDefaults.standardUserDefaults setObject:testPath forKey:WorkbenchDatabasePathPreference];
            NSError *testError = nil;
            NSDictionary *sample = @{ @"marker": @"sqlite-self-test", @"value": @42 };
            BOOL saved = [databaseDelegate saveWorkbenchState:sample error:&testError];
            NSDictionary *loaded = saved ? [databaseDelegate loadWorkbenchState:&testError] : nil;
            NSURL *migrationDirectory = [NSURL fileURLWithPath:[testRoot stringByAppendingPathComponent:@"migrated"] isDirectory:YES];
            [NSFileManager.defaultManager createDirectoryAtURL:migrationDirectory withIntermediateDirectories:YES attributes:nil error:&testError];
            NSString *migratedPath = loaded ? [databaseDelegate migrateDatabaseToDirectory:migrationDirectory error:&testError] : nil;
            NSDictionary *migrated = migratedPath ? [databaseDelegate loadWorkbenchState:&testError] : nil;
            BOOL passed = [loaded[@"marker"] isEqualToString:@"sqlite-self-test"] &&
                [migrated[@"value"] isEqualToNumber:@42] && migratedPath.length > 0;
            if (originalPath.length) [NSUserDefaults.standardUserDefaults setObject:originalPath forKey:WorkbenchDatabasePathPreference];
            else [NSUserDefaults.standardUserDefaults removeObjectForKey:WorkbenchDatabasePathPreference];
            [NSFileManager.defaultManager removeItemAtPath:testRoot error:nil];
            if (!passed) {
                fprintf(stderr, "SQLite self-test failed: %s\n", (testError.localizedDescription ?: @"unknown error").UTF8String);
                return 1;
            }
            printf("PASS: SQLite create, save, load, and migration verified.\n");
            return 0;
        }
        if (argc == 2 && strcmp(argv[1], "--bundle-migration-self-test") == 0) {
            WorkbenchAppDelegate *delegate = [[WorkbenchAppDelegate alloc] init];
            NSString *root = [NSTemporaryDirectory() stringByAppendingPathComponent:[@"growth-workbench-bundle-migration-" stringByAppendingString:NSUUID.UUID.UUIDString]];
            NSString *oldDirectory = [root stringByAppendingPathComponent:@"old"];
            NSString *newDirectory = [root stringByAppendingPathComponent:@"new"];
            NSString *oldDatabase = [oldDirectory stringByAppendingPathComponent:@"workbench.sqlite3"];
            NSString *newDatabase = [newDirectory stringByAppendingPathComponent:@"workbench.sqlite3"];
            [NSFileManager.defaultManager createDirectoryAtPath:[oldDirectory stringByAppendingPathComponent:@"Library"] withIntermediateDirectories:YES attributes:nil error:nil];
            [@"managed-file" writeToFile:[[oldDirectory stringByAppendingPathComponent:@"Library"] stringByAppendingPathComponent:@"marker.txt"] atomically:YES encoding:NSUTF8StringEncoding error:nil];
            NSString *previousPath = [NSUserDefaults.standardUserDefaults stringForKey:WorkbenchDatabasePathPreference];
            [NSUserDefaults.standardUserDefaults setObject:oldDatabase forKey:WorkbenchDatabasePathPreference];
            NSError *error = nil;
            BOOL seeded = [delegate saveWorkbenchState:@{ @"marker": @"legacy-data", @"value": @42 } error:&error];
            BOOL copiedFiles = seeded && [delegate copyMissingItemsFromDirectory:oldDirectory toDirectory:newDirectory error:&error];
            BOOL copiedDatabase = copiedFiles && [delegate copySQLiteDatabaseAtPath:oldDatabase toPath:newDatabase error:&error];
            [NSUserDefaults.standardUserDefaults setObject:newDatabase forKey:WorkbenchDatabasePathPreference];
            NSDictionary *loaded = copiedDatabase ? [delegate loadWorkbenchState:&error] : nil;
            BOOL markerCopied = [NSFileManager.defaultManager fileExistsAtPath:[[newDirectory stringByAppendingPathComponent:@"Library"] stringByAppendingPathComponent:@"marker.txt"]];
            if (previousPath.length) [NSUserDefaults.standardUserDefaults setObject:previousPath forKey:WorkbenchDatabasePathPreference];
            else [NSUserDefaults.standardUserDefaults removeObjectForKey:WorkbenchDatabasePathPreference];
            [NSFileManager.defaultManager removeItemAtPath:root error:nil];
            if (![loaded[@"marker"] isEqualToString:@"legacy-data"] || ![loaded[@"value"] isEqualToNumber:@42] || !markerCopied) {
                fprintf(stderr, "Bundle migration self-test failed: %s\n", (error.localizedDescription ?: @"unknown error").UTF8String);
                return 1;
            }
            printf("PASS: legacy SQLite and managed files copy without deleting the source.\n");
            return 0;
        }
        if (argc == 2 && strcmp(argv[1], "--recommendation-ai-self-test") == 0) return RunRecommendationAISelfTest();
        if (argc == 2 && strcmp(argv[1], "--backup-self-test") == 0) {
            WorkbenchAppDelegate *delegate = [[WorkbenchAppDelegate alloc] init]; NSString *root = [NSTemporaryDirectory() stringByAppendingPathComponent:[@"growth-workbench-backup-test-" stringByAppendingString:NSUUID.UUID.UUIDString]]; [NSFileManager.defaultManager createDirectoryAtPath:root withIntermediateDirectories:YES attributes:nil error:nil];
            NSArray *keys = @[WorkbenchDatabasePathPreference, WorkbenchBackupPathPreference, WorkbenchLibraryPathPreference, WorkbenchCET6PathPreference, WorkbenchIELTSPathPreference, WorkbenchIELTSRecordingPathPreference]; NSMutableDictionary *previous = [NSMutableDictionary dictionary]; for (NSString *key in keys) { NSString *value = [NSUserDefaults.standardUserDefaults stringForKey:key]; if (value) previous[key] = value; }
            [NSUserDefaults.standardUserDefaults setObject:[root stringByAppendingPathComponent:@"source.sqlite3"] forKey:WorkbenchDatabasePathPreference]; [NSUserDefaults.standardUserDefaults setObject:root forKey:WorkbenchBackupPathPreference]; for (NSString *key in @[WorkbenchLibraryPathPreference, WorkbenchCET6PathPreference, WorkbenchIELTSPathPreference, WorkbenchIELTSRecordingPathPreference]) [NSUserDefaults.standardUserDefaults setObject:[root stringByAppendingPathComponent:key] forKey:key];
            NSString *library = [root stringByAppendingPathComponent:WorkbenchLibraryPathPreference]; [NSFileManager.defaultManager createDirectoryAtPath:library withIntermediateDirectories:YES attributes:nil error:nil]; NSString *managedMarker = [library stringByAppendingPathComponent:@"managed-marker.txt"]; [@"managed-backup" writeToFile:managedMarker atomically:YES encoding:NSUTF8StringEncoding error:nil];
            NSError *error = nil; BOOL saved = [delegate saveWorkbenchState:@{ @"marker": @"before-backup", @"value": @42 } error:&error]; NSDictionary *backup = saved ? [delegate createEncryptedBackupInDirectory:root password:@"test-password-123" error:&error] : nil; NSDictionary *manifest = backup ? [delegate inspectEncryptedBackup:backup[@"path"] password:@"test-password-123" error:&error] : nil; if (manifest) { [delegate saveWorkbenchState:@{ @"marker": @"after-backup" } error:&error]; [NSFileManager.defaultManager removeItemAtPath:library error:nil]; } NSDictionary *restored = manifest ? [delegate applyInspectedBackup:&error] : nil; BOOL managedRestored = [NSFileManager.defaultManager fileExistsAtPath:managedMarker];
            for (NSString *key in keys) { if (previous[key]) [NSUserDefaults.standardUserDefaults setObject:previous[key] forKey:key]; else [NSUserDefaults.standardUserDefaults removeObjectForKey:key]; } [NSFileManager.defaultManager removeItemAtPath:root error:nil]; BOOL passed = [restored[@"marker"] isEqualToString:@"before-backup"] && [restored[@"value"] isEqualToNumber:@42] && managedRestored; if (!passed) { fprintf(stderr, "Backup self-test failed: %s\n", (error.localizedDescription ?: @"unknown error").UTF8String); return 1; } printf("PASS: encrypted database and managed-file backup create, inspect, snapshot-before-restore, and restore verified.\n"); return 0;
        }
        NSApplication *application = NSApplication.sharedApplication;
        WorkbenchAppDelegate *delegate = [[WorkbenchAppDelegate alloc] init];
        application.delegate = delegate;
        [application run];
    }
    return 0;
}
