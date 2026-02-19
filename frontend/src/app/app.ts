import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BeamsBackgroundComponent } from './shared/beams/beams-background.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, BeamsBackgroundComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}
