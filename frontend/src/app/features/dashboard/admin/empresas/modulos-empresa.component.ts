import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BusinessModuleService, BusinessModuleDto } from '../../../../services/business-module.service';
import { BusinessService } from '../../../../services/business.service';

interface ModuleRow extends BusinessModuleDto {
  _dirty: boolean;
  _saving: boolean;
  _mode: 'unlimited' | 'timed';
  _snapshot: string;
}

@Component({
  selector: 'app-modulos-empresa',
  template: `
    <!-- Loading -->
    <div class="mod-loading" *ngIf="loading">
      <div class="mod-spinner"></div>
      <p>Cargando módulos...</p>
    </div>

    <div class="mod-page" *ngIf="!loading">
      <!-- ══════════ HEADER ══════════ -->
      <div class="mod-header">
        <div class="mod-header-left">
          <div class="mod-header-icon">
            <i class="fas fa-building"></i>
          </div>
          <div>
            <h1 class="mod-header-title">
              {{ businessName || 'Empresa' }}
              <span class="mod-plan-badge">Plan Enterprise</span>
            </h1>
            <p class="mod-header-sub">Gestión de Módulos &bull; RUC: {{ businessRuc || '---' }}</p>
          </div>
        </div>
        <div class="mod-header-actions">
          <button class="mod-btn-ghost" (click)="goBack()">
            <i class="fas fa-arrow-left"></i> Volver
          </button>
        </div>
      </div>

      <!-- ══════════ STATS ROW ══════════ -->
      <div class="mod-stats-row">
        <div class="mod-stat-card">
          <p class="mod-stat-label">MÓDULOS ACTIVOS</p>
          <div class="mod-stat-value-row">
            <span class="mod-stat-number text-success">{{ countActive() }}</span>
            <span class="mod-stat-detail">de {{ modules.length }}</span>
          </div>
        </div>
        <div class="mod-stat-card">
          <p class="mod-stat-label">ILIMITADOS</p>
          <div class="mod-stat-value-row">
            <span class="mod-stat-number" style="color:#135bec">{{ countUnlimited() }}</span>
            <span class="mod-stat-detail">sin vencimiento</span>
          </div>
        </div>
        <div class="mod-stat-card">
          <p class="mod-stat-label">POR VENCER</p>
          <div class="mod-stat-value-row">
            <span class="mod-stat-number text-warning">{{ countExpiringSoon() }}</span>
            <span class="mod-stat-detail">próximos 30 días</span>
          </div>
        </div>
        <div class="mod-stat-card mod-stat-search">
          <div class="mod-search-box">
            <i class="fas fa-search"></i>
            <input type="text" placeholder="Buscar módulos..." [(ngModel)]="searchTerm">
          </div>
        </div>
      </div>

      <!-- ══════════ ERROR ══════════ -->
      <div class="mod-alert-error" *ngIf="error">
        <i class="fas fa-exclamation-triangle"></i>
        <div style="flex:1">
          <strong>Error:</strong> {{ error }}
        </div>
        <button class="mod-btn-ghost" (click)="loadModules()">
          <i class="fas fa-sync-alt"></i> Reintentar
        </button>
      </div>

      <!-- ══════════ EMPTY STATE ══════════ -->
      <div class="mod-empty" *ngIf="!error && modules.length === 0">
        <i class="fas fa-puzzle-piece"></i>
        <h4>No se encontraron módulos del sistema</h4>
        <p>Reinicie el backend para poblar los módulos automáticamente.</p>
        <button class="mod-btn-primary" (click)="loadModules()">
          <i class="fas fa-sync-alt"></i> Recargar
        </button>
      </div>

      <!-- ══════════ MODULE GRID ══════════ -->
      <div class="mod-grid" *ngIf="modules.length > 0">
        <div *ngFor="let mod of filteredModules()" class="mod-card"
             [class.mod-card-active]="mod.effectivelyActive"
             [class.mod-card-expired]="mod.active && !mod.effectivelyActive"
             [class.mod-card-inactive]="!mod.active">

          <!-- Card top: icon + name + toggle -->
          <div class="mod-card-top">
            <div class="mod-card-icon"
                 [style.background]="mod.active ? (getIconBg(mod)) : '#f1f5f9'"
                 [style.color]="mod.active ? (mod.moduleColor || '#6c757d') : '#94a3b8'">
              <i [class]="mod.moduleIcon || 'fas fa-cube'"></i>
            </div>
            <div class="mod-card-info">
              <h4 class="mod-card-name">{{ mod.moduleName }}</h4>
              <p class="mod-card-desc">{{ mod.moduleDescription }}</p>
            </div>
            <label class="mod-toggle">
              <input type="checkbox" [checked]="mod.active" (change)="onToggle(mod, $event)">
              <span class="mod-toggle-track"></span>
            </label>
          </div>

          <!-- ── Duration mode selector (only when active) ── -->
          <div class="mod-mode-selector" *ngIf="mod.active">
            <button class="mod-mode-btn"
                    [class.mod-mode-active-blue]="mod._mode === 'unlimited'"
                    (click)="setMode(mod, 'unlimited')">
              <i class="fas fa-infinity"></i> Ilimitado
            </button>
            <button class="mod-mode-btn"
                    [class.mod-mode-active-green]="mod._mode === 'timed'"
                    (click)="setMode(mod, 'timed')">
              <i class="fas fa-calendar-alt"></i> Con Fecha
            </button>
          </div>

          <!-- ── Unlimited badge ── -->
          <div class="mod-unlimited-badge" *ngIf="mod.active && mod._mode === 'unlimited'">
            <i class="fas fa-infinity"></i>
            <span>TIEMPO ILIMITADO</span>
            <small>Este módulo no tiene fecha de vencimiento</small>
          </div>

          <!-- ── Date fields (only in timed mode) ── -->
          <div class="mod-card-dates" *ngIf="mod.active && mod._mode === 'timed'">
            <div class="mod-date-field">
              <label class="mod-date-label">FECHA INICIO</label>
              <input type="date" class="mod-date-input"
                     [value]="mod.startDate || ''"
                     (change)="onDateChange(mod, 'startDate', $event)">
            </div>
            <div class="mod-date-field">
              <label class="mod-date-label"
                     [class.mod-date-label-danger]="isExpired(mod)"
                     [class.mod-date-label-warning]="isExpiringSoon(mod) && !isExpired(mod)">
                FECHA VENCIMIENTO
              </label>
              <input type="date" class="mod-date-input"
                     [class.mod-date-danger]="isExpired(mod)"
                     [class.mod-date-warning]="isExpiringSoon(mod) && !isExpired(mod)"
                     [value]="mod.expirationDate || ''"
                     (change)="onDateChange(mod, 'expirationDate', $event)">
            </div>
          </div>

          <!-- ── Progress bar (only in timed mode with both dates) ── -->
          <div class="mod-progress-section" *ngIf="mod.active && mod._mode === 'timed' && mod.startDate && mod.expirationDate">
            <div class="mod-progress-header">
              <span class="mod-progress-label">Uso del tiempo</span>
              <span class="mod-progress-pct"
                    [class.text-success]="getProgress(mod) < 80"
                    [class.text-warning]="getProgress(mod) >= 80 && getProgress(mod) < 100"
                    [class.text-danger]="getProgress(mod) >= 100">
                {{ getProgress(mod) }}%
              </span>
            </div>
            <div class="mod-progress-bar">
              <div class="mod-progress-fill"
                   [style.width.%]="clamp(getProgress(mod), 0, 100)"
                   [class.mod-fill-ok]="getProgress(mod) < 80"
                   [class.mod-fill-warn]="getProgress(mod) >= 80 && getProgress(mod) < 100"
                   [class.mod-fill-danger]="getProgress(mod) >= 100">
              </div>
            </div>
            <div class="mod-progress-detail">
              <span>{{ getDaysElapsed(mod) }} días consumidos</span>
              <span>{{ getDaysRemaining(mod) }} días restantes</span>
            </div>
          </div>

          <!-- ── Notes ── -->
          <div class="mod-notes-section" *ngIf="mod.active">
            <textarea class="mod-notes-input" rows="2"
                      [value]="mod.notes || ''" placeholder="Notas del administrador..."
                      (blur)="onNotesChange(mod, $event)"></textarea>
          </div>

          <!-- ── Card footer: status + actions ── -->
          <div class="mod-card-footer">
            <div class="mod-status-row">
              <!-- Unlimited -->
              <div class="mod-status-dot" *ngIf="mod.effectivelyActive && mod._mode === 'unlimited'">
                <span class="dot dot-blue"></span>
                <span class="mod-status-text" style="color:#135bec">ILIMITADO</span>
              </div>
              <!-- Active timed -->
              <div class="mod-status-dot" *ngIf="mod.effectivelyActive && mod._mode === 'timed' && !isExpiringSoon(mod)">
                <span class="dot dot-green"></span>
                <span class="mod-status-text text-success">ACTIVO</span>
              </div>
              <!-- Active but expiring soon -->
              <div class="mod-status-dot" *ngIf="mod.effectivelyActive && isExpiringSoon(mod)">
                <span class="dot dot-green dot-pulse"></span>
                <span class="mod-status-text text-warning">POR VENCER</span>
              </div>
              <!-- Expired -->
              <div class="mod-status-dot" *ngIf="mod.active && !mod.effectivelyActive">
                <span class="dot dot-red"></span>
                <span class="mod-status-text text-danger">EXPIRADO</span>
              </div>
              <!-- Inactive -->
              <div class="mod-status-dot" *ngIf="!mod.active">
                <span class="dot dot-gray"></span>
                <span class="mod-status-text text-secondary">INACTIVO</span>
              </div>
            </div>

            <!-- Warning badge -->
            <div *ngIf="isExpiringSoon(mod) && !isExpired(mod)" class="mod-expiry-warn">
              <i class="fas fa-exclamation-triangle"></i>
              Vence en {{ getDaysRemaining(mod) }}d
            </div>
            <div *ngIf="isExpired(mod)" class="mod-expiry-badge">
              REQUIERE ATENCIÓN
            </div>

            <!-- Cancel + Save buttons -->
            <div class="mod-action-btns" *ngIf="mod._dirty">
              <button class="mod-btn-cancel" (click)="cancelModule(mod)">
                <i class="fas fa-times"></i> Cancelar
              </button>
              <button class="mod-btn-save" (click)="saveModule(mod)" [disabled]="mod._saving">
                <i class="fas fa-save" *ngIf="!mod._saving"></i>
                <i class="fas fa-spinner fa-spin" *ngIf="mod._saving"></i>
                {{ mod._saving ? 'Guardando...' : 'Guardar' }}
              </button>
            </div>
          </div>

        </div>
      </div>

      <!-- ══════════ FLOATING ACTION BAR ══════════ -->
      <div class="mod-float-bar" *ngIf="hasUnsavedChanges()">
        <div class="mod-float-info">
          <span class="mod-float-dot"></span>
          <span class="mod-float-text">{{ countDirty() }} cambio(s) sin guardar</span>
        </div>
        <div class="mod-float-actions">
          <button class="mod-float-discard" (click)="cancelAll()">Descartar Todo</button>
          <button class="mod-float-save" (click)="saveAll()">Guardar Todo</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ── Page layout ── */
    .mod-page { padding: 24px; max-width: 1200px; margin: 0 auto; font-family: 'Segoe UI', system-ui, sans-serif; }

    /* ── Loading ── */
    .mod-loading {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 100px 20px; color: #64748b;
    }
    .mod-spinner {
      width: 44px; height: 44px; border: 4px solid #e2e8f0;
      border-top: 4px solid #135bec; border-radius: 50%;
      animation: modSpin 0.8s linear infinite; margin-bottom: 16px;
    }
    @keyframes modSpin { to { transform: rotate(360deg); } }

    /* ── Header ── */
    .mod-header {
      display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 16px; margin-bottom: 28px;
      padding: 20px 24px; background: #fff; border-radius: 12px;
      border: 1px solid rgba(19,91,236,0.08); box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .mod-header-left { display: flex; align-items: center; gap: 14px; }
    .mod-header-icon {
      width: 48px; height: 48px; border-radius: 12px; background: #135bec;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 20px; box-shadow: 0 4px 12px rgba(19,91,236,0.25);
    }
    .mod-header-title {
      font-size: 18px; font-weight: 800; color: #1e293b; margin: 0;
      display: flex; align-items: center; gap: 10px;
    }
    .mod-plan-badge {
      font-size: 10px; font-weight: 700; background: rgba(19,91,236,0.1);
      color: #135bec; padding: 3px 10px; border-radius: 20px;
    }
    .mod-header-sub { font-size: 13px; color: #94a3b8; margin: 2px 0 0; }
    .mod-header-actions { display: flex; gap: 10px; flex-wrap: wrap; }

    /* ── Buttons ── */
    .mod-btn-ghost {
      padding: 8px 16px; font-size: 13px; font-weight: 600; color: #64748b;
      background: transparent; border: 1px solid #e2e8f0; border-radius: 8px;
      cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 6px;
    }
    .mod-btn-ghost:hover { background: #f8fafc; color: #334155; }
    .mod-btn-primary {
      padding: 8px 20px; font-size: 13px; font-weight: 700; color: #fff;
      background: #135bec; border: none; border-radius: 8px; cursor: pointer;
      box-shadow: 0 4px 12px rgba(19,91,236,0.3); transition: all 0.15s;
      display: flex; align-items: center; gap: 6px;
    }
    .mod-btn-primary:hover { background: #1048c7; }

    /* ── Stats row ── */
    .mod-stats-row {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px;
    }
    .mod-stat-card {
      background: #fff; padding: 18px 20px; border-radius: 12px;
      border: 1px solid rgba(19,91,236,0.05); box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .mod-stat-label { font-size: 10px; font-weight: 700; color: #94a3b8; letter-spacing: 0.8px; margin: 0 0 6px; }
    .mod-stat-value-row { display: flex; align-items: flex-end; justify-content: space-between; }
    .mod-stat-number { font-size: 28px; font-weight: 800; line-height: 1; }
    .mod-stat-detail { font-size: 11px; color: #94a3b8; font-weight: 600; margin-bottom: 3px; }
    .mod-stat-search { display: flex; align-items: center; padding: 8px; }
    .mod-search-box {
      display: flex; align-items: center; gap: 10px; width: 100%;
      padding: 0 14px; color: #94a3b8;
    }
    .mod-search-box input {
      border: none; outline: none; background: transparent; width: 100%;
      font-size: 13px; color: #334155;
    }
    .mod-search-box input::placeholder { color: #cbd5e1; }

    /* ── Error / Empty ── */
    .mod-alert-error {
      display: flex; align-items: center; gap: 12px;
      background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px;
      padding: 16px 20px; margin-bottom: 24px; color: #dc2626;
    }
    .mod-empty {
      text-align: center; padding: 60px 20px; background: #fffbeb;
      border: 1px solid #fef3c7; border-radius: 12px; margin-bottom: 24px;
    }
    .mod-empty i { font-size: 48px; color: #d97706; margin-bottom: 16px; display: block; }
    .mod-empty h4 { color: #92400e; margin: 0 0 8px; font-weight: 700; }
    .mod-empty p { color: #a16207; margin: 0 0 16px; font-size: 14px; }

    /* ── Module Grid ── */
    .mod-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 20px; margin-bottom: 80px;
    }

    /* ── Module Card ── */
    .mod-card {
      background: #fff; border-radius: 12px; padding: 22px;
      border: 2px solid rgba(19,91,236,0.08); display: flex; flex-direction: column;
      gap: 16px; transition: all 0.2s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .mod-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
    .mod-card-active { border-color: rgba(19,91,236,0.15); }
    .mod-card-expired { border-color: #fecdd3; }
    .mod-card-inactive { background: #f8fafc; border-color: #e2e8f0; opacity: 0.85; }
    .mod-card-inactive:hover { transform: none; }

    /* Card top */
    .mod-card-top { display: flex; align-items: flex-start; gap: 14px; }
    .mod-card-icon {
      width: 48px; height: 48px; border-radius: 10px; display: flex;
      align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;
    }
    .mod-card-info { flex: 1; min-width: 0; }
    .mod-card-name { font-size: 16px; font-weight: 700; color: #1e293b; margin: 0 0 2px; line-height: 1.2; }
    .mod-card-desc { font-size: 11px; color: #94a3b8; margin: 0; line-height: 1.4; }

    /* Toggle */
    .mod-toggle { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
    .mod-toggle input { opacity: 0; width: 0; height: 0; }
    .mod-toggle-track {
      position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
      background-color: #cbd5e1; transition: 0.25s; border-radius: 24px;
    }
    .mod-toggle-track:before {
      position: absolute; content: ""; height: 20px; width: 20px;
      left: 2px; bottom: 2px; background-color: white;
      transition: 0.25s; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.15);
    }
    .mod-toggle input:checked + .mod-toggle-track { background-color: #135bec; }
    .mod-toggle input:checked + .mod-toggle-track:before { transform: translateX(20px); }

    /* Mode selector */
    .mod-mode-selector {
      display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
    }
    .mod-mode-btn {
      padding: 9px 12px; border: 2px solid #e2e8f0; border-radius: 10px;
      background: #fff; color: #64748b; font-size: 12px; font-weight: 700;
      cursor: pointer; transition: all 0.15s; display: flex; align-items: center;
      justify-content: center; gap: 6px;
    }
    .mod-mode-btn:hover { background: #f8fafc; }
    .mod-mode-active-blue {
      border-color: #135bec; background: rgba(19,91,236,0.06); color: #135bec;
    }
    .mod-mode-active-green {
      border-color: #22c55e; background: rgba(34,197,94,0.06); color: #16a34a;
    }

    /* Dates */
    .mod-card-dates { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .mod-date-field { display: flex; flex-direction: column; }
    .mod-date-label {
      font-size: 9px; font-weight: 700; color: #94a3b8;
      letter-spacing: 0.6px; margin-bottom: 4px;
    }
    .mod-date-label-danger { color: #f43f5e !important; }
    .mod-date-label-warning { color: #f59e0b !important; }
    .mod-date-input {
      width: 100%; padding: 7px 10px; border: 1px solid #e2e8f0;
      border-radius: 8px; font-size: 13px; color: #334155;
      background: #fff; transition: border-color 0.15s;
    }
    .mod-date-input:focus { border-color: #135bec; outline: none; box-shadow: 0 0 0 2px rgba(19,91,236,0.15); }
    .mod-date-danger { border-color: #fda4af !important; color: #e11d48 !important; font-weight: 600; }
    .mod-date-warning { border-color: #fde68a !important; color: #d97706 !important; font-weight: 600; }

    /* Progress bar */
    .mod-progress-section { display: flex; flex-direction: column; gap: 4px; }
    .mod-progress-header { display: flex; justify-content: space-between; align-items: center; }
    .mod-progress-label { font-size: 10px; font-weight: 700; color: #94a3b8; letter-spacing: 0.5px; }
    .mod-progress-pct { font-size: 12px; font-weight: 800; }
    .mod-progress-bar { height: 6px; background: #e2e8f0; border-radius: 6px; overflow: hidden; }
    .mod-progress-fill { height: 100%; border-radius: 6px; transition: width 0.4s ease; }
    .mod-fill-ok { background: linear-gradient(90deg, #22c55e, #16a34a); }
    .mod-fill-warn { background: linear-gradient(90deg, #f59e0b, #d97706); }
    .mod-fill-danger { background: linear-gradient(90deg, #f43f5e, #dc2626); }
    .mod-progress-detail {
      display: flex; justify-content: space-between;
      font-size: 10px; color: #94a3b8; font-weight: 600;
    }

    /* Unlimited badge */
    .mod-unlimited-badge {
      display: flex; flex-direction: column; align-items: center; gap: 2px;
      padding: 14px; background: linear-gradient(135deg, rgba(19,91,236,0.05), rgba(19,91,236,0.1));
      border: 1px dashed rgba(19,91,236,0.25); border-radius: 10px; text-align: center;
    }
    .mod-unlimited-badge i { font-size: 20px; color: #135bec; }
    .mod-unlimited-badge span { font-size: 11px; font-weight: 800; color: #135bec; letter-spacing: 1px; }
    .mod-unlimited-badge small { font-size: 10px; color: #94a3b8; }

    /* Notes */
    .mod-notes-input {
      width: 100%; padding: 8px 12px; border: 1px solid #e2e8f0;
      border-radius: 8px; font-size: 12px; color: #475569;
      resize: vertical; background: #f8fafc; font-family: inherit;
      transition: border-color 0.15s;
    }
    .mod-notes-input:focus { border-color: #135bec; outline: none; background: #fff; }

    /* Footer */
    .mod-card-footer {
      display: flex; align-items: center; gap: 10px;
      padding-top: 14px; border-top: 1px solid #f1f5f9; flex-wrap: wrap;
    }
    .mod-status-row { display: flex; align-items: center; gap: 10px; flex: 1; }
    .mod-status-dot { display: flex; align-items: center; gap: 6px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .dot-green { background: #22c55e; }
    .dot-red { background: #f43f5e; }
    .dot-gray { background: #94a3b8; }
    .dot-blue { background: #135bec; }
    .dot-pulse { animation: dotPulse 1.5s ease-in-out infinite; }
    @keyframes dotPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
    .mod-status-text { font-size: 10px; font-weight: 800; letter-spacing: 0.8px; }
    .mod-expiry-warn {
      font-size: 10px; font-weight: 700; color: #d97706;
      display: flex; align-items: center; gap: 4px;
    }
    .mod-expiry-badge {
      font-size: 9px; font-weight: 800; color: #e11d48; letter-spacing: 0.3px;
      background: #fff1f2; padding: 3px 8px; border-radius: 4px;
    }
    .mod-action-btns { display: flex; gap: 8px; margin-left: auto; }
    .mod-btn-cancel {
      padding: 6px 14px; font-size: 12px; font-weight: 700; color: #64748b;
      background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer;
      display: flex; align-items: center; gap: 5px;
    }
    .mod-btn-cancel:hover { background: #e2e8f0; color: #334155; }
    .mod-btn-save {
      padding: 6px 14px; font-size: 12px; font-weight: 700; color: #fff;
      background: #135bec; border: none; border-radius: 6px; cursor: pointer;
      display: flex; align-items: center; gap: 5px;
    }
    .mod-btn-save:hover { background: #1048c7; }
    .mod-btn-save:disabled { opacity: 0.6; cursor: not-allowed; }

    /* ── Floating bar ── */
    .mod-float-bar {
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      background: #0f172a; color: #fff; padding: 12px 24px; border-radius: 50px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3); display: flex; align-items: center;
      gap: 24px; z-index: 1000; border: 1px solid rgba(255,255,255,0.1);
    }
    .mod-float-info { display: flex; align-items: center; gap: 8px; padding-right: 20px; border-right: 1px solid rgba(255,255,255,0.2); }
    .mod-float-dot {
      width: 8px; height: 8px; background: #135bec; border-radius: 50%;
      animation: dotPulse 1.5s ease-in-out infinite;
    }
    .mod-float-text { font-size: 13px; font-weight: 700; white-space: nowrap; }
    .mod-float-actions { display: flex; align-items: center; gap: 12px; }
    .mod-float-discard {
      background: none; border: none; color: #94a3b8; font-size: 11px;
      font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 1px;
    }
    .mod-float-discard:hover { color: #fff; }
    .mod-float-save {
      background: #135bec; color: #fff; border: none; padding: 6px 16px;
      border-radius: 20px; font-size: 12px; font-weight: 700; cursor: pointer;
    }
    .mod-float-save:hover { background: #1048c7; }

    /* ── Responsive ── */
    @media (max-width: 900px) {
      .mod-stats-row { grid-template-columns: repeat(2, 1fr); }
      .mod-grid { grid-template-columns: 1fr; }
      .mod-header { flex-direction: column; align-items: flex-start; }
    }
    @media (max-width: 600px) {
      .mod-stats-row { grid-template-columns: 1fr; }
      .mod-card-dates { grid-template-columns: 1fr; }
      .mod-float-bar { flex-direction: column; gap: 12px; border-radius: 16px; padding: 16px; }
    }

    /* Bootstrap overrides */
    .text-success { color: #22c55e !important; }
    .text-warning { color: #f59e0b !important; }
    .text-danger { color: #f43f5e !important; }
    .text-secondary { color: #94a3b8 !important; }
  `]
})
export class ModulosEmpresaComponent implements OnInit {
  modules: ModuleRow[] = [];
  businessId!: number;
  businessName = '';
  businessRuc = '';
  loading = true;
  error = '';
  searchTerm = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private businessModuleService: BusinessModuleService,
    private businessService: BusinessService
  ) {}

  ngOnInit(): void {
    this.businessId = +this.route.snapshot.params['id'];
    console.log('[ModulosEmpresa] Init businessId:', this.businessId);
    this.loadBusiness();
    this.loadModules();
  }

  loadBusiness(): void {
    this.businessService.getById(this.businessId).subscribe({
      next: (b: any) => {
        this.businessName = b.name || b.businessName || '';
        this.businessRuc = b.ruc || '';
      },
      error: (err: any) => console.error('[ModulosEmpresa] Error business:', err)
    });
  }

  loadModules(): void {
    this.loading = true;
    this.error = '';
    this.businessModuleService.getModulesByBusiness(this.businessId).subscribe({
      next: (data) => {
        console.log('[ModulosEmpresa] Módulos:', data.length, data);
        this.modules = data.map(m => this.toRow(m));
        this.loading = false;
      },
      error: (err) => {
        console.error('[ModulosEmpresa] Error:', err);
        if (err.status === 403) {
          this.error = 'Acceso denegado. Cierre sesión e ingrese de nuevo con el usuario Super Admin.';
        } else if (err.status === 0) {
          this.error = 'No se pudo conectar con el servidor. Verifique que el backend esté en puerto 8081.';
        } else {
          this.error = (err.error?.message || err.message || 'Error desconocido') + ' (HTTP ' + err.status + ')';
        }
        this.loading = false;
      }
    });
  }

  private toRow(m: BusinessModuleDto): ModuleRow {
    const mode: 'unlimited' | 'timed' = m.expirationDate ? 'timed' : 'unlimited';
    const row: ModuleRow = {
      ...m,
      _dirty: false,
      _saving: false,
      _mode: mode,
      _snapshot: JSON.stringify(m)
    };
    return row;
  }

  filteredModules(): ModuleRow[] {
    if (!this.searchTerm) return this.modules;
    const term = this.searchTerm.toLowerCase();
    return this.modules.filter(m =>
      m.moduleName.toLowerCase().includes(term) ||
      m.moduleCode.toLowerCase().includes(term) ||
      (m.moduleDescription || '').toLowerCase().includes(term)
    );
  }

  // ── Stats helpers ──
  countActive(): number { return this.modules.filter(m => m.effectivelyActive).length; }
  countUnlimited(): number { return this.modules.filter(m => m.effectivelyActive && !m.expirationDate).length; }
  countExpired(): number { return this.modules.filter(m => m.active && !m.effectivelyActive).length; }
  countExpiringSoon(): number { return this.modules.filter(m => this.isExpiringSoon(m) && !this.isExpired(m)).length; }
  countDirty(): number { return this.modules.filter(m => m._dirty).length; }
  hasUnsavedChanges(): boolean { return this.modules.some(m => m._dirty); }

  // ── Progress helpers ──
  clamp(v: number, min: number, max: number): number { return Math.min(Math.max(v, min), max); }

  getProgress(mod: ModuleRow): number {
    if (!mod.startDate || !mod.expirationDate) return 0;
    const start = new Date(mod.startDate).getTime();
    const end = new Date(mod.expirationDate).getTime();
    const total = end - start;
    if (total <= 0) return 100;
    return Math.round(((Date.now() - start) / total) * 100);
  }

  getDaysElapsed(mod: ModuleRow): number {
    if (!mod.startDate) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(mod.startDate).getTime()) / 86400000));
  }

  getDaysRemaining(mod: ModuleRow): number {
    if (!mod.expirationDate) return 0;
    return Math.max(0, Math.ceil((new Date(mod.expirationDate).getTime() - Date.now()) / 86400000));
  }

  isExpired(mod: ModuleRow): boolean {
    return mod.active && !mod.effectivelyActive && !!mod.expirationDate;
  }

  isExpiringSoon(mod: ModuleRow): boolean {
    if (!mod.active || !mod.expirationDate) return false;
    const rem = this.getDaysRemaining(mod);
    return rem > 0 && rem <= 30;
  }

  getIconBg(mod: ModuleRow): string {
    return (mod.moduleColor || '#6c757d') + '18';
  }

  // ── Mode change ──
  setMode(mod: ModuleRow, mode: 'unlimited' | 'timed'): void {
    if (mod._mode === mode) return;
    mod._mode = mode;
    if (mode === 'unlimited') {
      mod.expirationDate = null;
    }
    mod._dirty = true;
    mod.effectivelyActive = this.calcEffective(mod);
  }

  // ── Actions ──
  onToggle(mod: ModuleRow, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    mod._saving = true;
    const body: any = {
      active: checked,
      startDate: mod.startDate || null,
      expirationDate: checked ? null : mod.expirationDate,
      notes: mod.notes || null
    };
    if (checked && !mod.startDate) {
      body.startDate = new Date().toISOString().split('T')[0];
    }
    this.businessModuleService.toggleModule(this.businessId, mod.moduleId, body).subscribe({
      next: (updated) => {
        const row = this.toRow(updated);
        Object.assign(mod, row);
      },
      error: (err) => {
        (event.target as HTMLInputElement).checked = !checked;
        mod._saving = false;
        alert('Error al cambiar estado: ' + (err.error?.message || err.message || 'Error desconocido'));
      }
    });
  }

  onDateChange(mod: ModuleRow, field: string, event: Event): void {
    (mod as any)[field] = (event.target as HTMLInputElement).value || null;
    mod._dirty = true;
    mod.effectivelyActive = this.calcEffective(mod);
  }

  onNotesChange(mod: ModuleRow, event: Event): void {
    const v = (event.target as HTMLTextAreaElement).value;
    if (v !== (mod.notes || '')) { mod.notes = v; mod._dirty = true; }
  }

  cancelModule(mod: ModuleRow): void {
    const orig: BusinessModuleDto = JSON.parse(mod._snapshot);
    Object.assign(mod, orig, {
      _dirty: false,
      _saving: false,
      _mode: orig.expirationDate ? 'timed' : 'unlimited',
      _snapshot: mod._snapshot
    });
  }

  cancelAll(): void {
    this.modules.filter(m => m._dirty).forEach(m => this.cancelModule(m));
  }

  saveModule(mod: ModuleRow): void {
    mod._saving = true;
    const body = {
      active: mod.active,
      startDate: mod.startDate || null,
      expirationDate: mod._mode === 'unlimited' ? null : (mod.expirationDate || null),
      notes: mod.notes || null
    };
    this.businessModuleService.toggleModule(this.businessId, mod.moduleId, body).subscribe({
      next: (u) => {
        const row = this.toRow(u);
        Object.assign(mod, row);
      },
      error: (err) => {
        mod._saving = false;
        alert('Error al guardar: ' + (err.error?.message || err.message || 'Error desconocido'));
      }
    });
  }

  saveAll(): void {
    this.modules.filter(m => m._dirty).forEach(m => this.saveModule(m));
  }

  goBack(): void {
    this.router.navigate(['/dashboard/admin/empresas']);
  }

  private calcEffective(mod: ModuleRow): boolean {
    if (!mod.active) return false;
    const today = new Date().toISOString().split('T')[0];
    if (mod.startDate && today < mod.startDate) return false;
    if (mod.expirationDate && today > mod.expirationDate) return false;
    return true;
  }
}
