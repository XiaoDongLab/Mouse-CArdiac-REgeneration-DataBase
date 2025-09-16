import { Component, OnInit } from '@angular/core';
import { AppBranch, AppCompileDate, AppComponent, AppVersion } from 'src/app/app.component';

@Component({
    selector: 'app-changelog',
    templateUrl: './changelog.component.html',
    styleUrls: ['./changelog.component.css'],
    standalone: false
})
export class ChangelogComponent implements OnInit {

  Version: string = "";
  CompileDate: string = "";
  Branch: string = "";

  constructor() { }

  ngOnInit(): void {
    this.Version = AppVersion;
    this.CompileDate = AppCompileDate;
    this.Branch = AppBranch;
  }

}
