'use strict';

import { window, Disposable, StatusBarItem, StatusBarAlignment } from 'vscode';

import * as SemaphoreCI from 'node-semaphoreci';
import * as open from 'open';

export class SemaphoreStatusController {
    private _semaphore: SemaphoreStatus;
    private _disposable: Disposable;

    constructor(authToken: string, projectHashId: string, branchName: string) {
        this._semaphore = new SemaphoreStatus(authToken, projectHashId, branchName);

        let subscriptions: Disposable[] = [];

        // Update the current status
        this._semaphore.updateIndicator();

        // Create a combined disposable from both event subscriptions
        this._disposable = Disposable.from(...subscriptions);
    }

    dispose() {
        this._disposable.dispose();
    }

    update() {
        this._semaphore.updateIndicator();
    }

    openWeb() {
        this._semaphore.openWeb();
    }

    private _onEvent() {
        this._semaphore.updateIndicator();
    }
}
class SemaphoreStatus {
    private _indicator: StatusBarItem;
    private _semaphoreClient: SemaphoreCI;
    private _branchName: string;
    private _webUrl: string;

    constructor(authToken: string, projectHashId: string, branchName: string) {
        this._semaphoreClient = new SemaphoreCI.default({
            api_url: "https://semaphoreci.com/api/v1",
            project_hash: projectHashId,
            auth_token: authToken
        });
        this._branchName = branchName;
        this._webUrl = "https://semaphoreci.com";
    }

    public updateIndicator() {
        if (!this._indicator) {
            this._indicator = window.createStatusBarItem(StatusBarAlignment.Left);
        }

        this._semaphoreClient.getBranchStatus({branch_name: this._branchName})
            .then((response) => {
                let statusCode = response.status;
                let buildStatus = response.data.result;
                this._webUrl = response.data.branch_url;
                this._setSuccessfulIndicatorText(statusCode, buildStatus);
            })
            .catch((err) => {
                let statusCode = err.status;
                this._setUnsuccessfulIndicatorText(statusCode);
            });

        this._indicator.show();
    }

    public openWeb() {
        open(this._webUrl);
    }

    private _setSuccessfulIndicatorText(statusCode: number, buildStatus: string) {
        switch (buildStatus) {
            case "passed":
                this._indicator.text = "$(check) Semaphore CI: Build Passed";
                break;
            case "failed":
                this._indicator.text = "$(x) SemaphoreCI: Build Failed";
                break;
            case "stopped":
                this._indicator.text = "$(stop) SemaphoreCI: Build Stopped";
                break;
            case "pending":
                this._indicator.text = "$(watch) SemaphoreCI: Build Pending";
                break;
        }
    }

    private _setUnsuccessfulIndicatorText(statusCode: number) {
        switch (statusCode) {
            case 401:
                this._indicator.text = "$(lock) Semaphore CI: Authentication required";
                break;
            case 404:
                this._indicator.text = "$(alert) Semaphore CI: Project not found";
                break;
            default:
                this._indicator.text = "$(alert) Semaphore CI: Connection error";
                break;
        }
    }

    dispose() {
        this._indicator.dispose();
    }
}
