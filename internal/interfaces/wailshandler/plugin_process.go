package wailshandler

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"os/exec"
	"strings"
	"sync"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const pluginProcessEventName = "volt:plugin-process"

type pluginProcessRuntimeEvent struct {
	RunID   string `json:"runId"`
	Type    string `json:"type"`
	Data    string `json:"data,omitempty"`
	Code    int    `json:"code,omitempty"`
	Message string `json:"message,omitempty"`
}

func (h *PluginHandler) StartPluginProcess(
	runID string,
	voltPath string,
	command string,
	args []string,
	stdin string,
	stdoutMode string,
	stderrMode string,
) error {
	if h.ctx == nil {
		return localizedUnexpectedError(h.localization, "backend.action.startPluginProcess", nil, errors.New("application context is not ready"))
	}

	normalizedRunID := strings.TrimSpace(runID)
	if normalizedRunID == "" {
		return localizedUnexpectedError(h.localization, "backend.action.startPluginProcess", nil, errors.New("run id is required"))
	}

	normalizedVoltPath := strings.TrimSpace(voltPath)
	if normalizedVoltPath == "" {
		return localizedUnexpectedError(h.localization, "backend.action.startPluginProcess", nil, errors.New("workspace path is required"))
	}

	normalizedCommand := strings.TrimSpace(command)
	if normalizedCommand == "" {
		return localizedUnexpectedError(h.localization, "backend.action.startPluginProcess", nil, errors.New("command is required"))
	}

	processPath, err := exec.LookPath(normalizedCommand)
	if err != nil {
		return errors.New(translate(h.localization, "backend.error.process.commandNotFound", map[string]any{
			"command": normalizedCommand,
		}))
	}

	h.processMu.Lock()
	if _, exists := h.processCancels[normalizedRunID]; exists {
		h.processMu.Unlock()
		return localizedUnexpectedError(h.localization, "backend.action.startPluginProcess", nil, errors.New("process run id already exists"))
	}
	runCtx, cancel := context.WithCancel(h.ctx)
	h.processCancels[normalizedRunID] = cancel
	h.processMu.Unlock()

	go h.runPluginProcess(
		runCtx,
		cancel,
		processPath,
		normalizedRunID,
		normalizedVoltPath,
		args,
		stdin,
		normalizePluginProcessMode(stdoutMode),
		normalizePluginProcessMode(stderrMode),
	)

	return nil
}

func (h *PluginHandler) CancelPluginProcess(runID string) error {
	normalizedRunID := strings.TrimSpace(runID)
	if normalizedRunID == "" {
		return nil
	}

	cancel, ok := h.consumeProcessCancel(normalizedRunID)
	if !ok {
		return nil
	}

	cancel()
	return nil
}

func (h *PluginHandler) runPluginProcess(
	runCtx context.Context,
	cancel context.CancelFunc,
	processPath string,
	runID string,
	voltPath string,
	args []string,
	stdin string,
	stdoutMode string,
	stderrMode string,
) {
	defer h.consumeProcessCancel(runID)

	cmd := exec.CommandContext(runCtx, processPath, args...)
	cmd.Dir = voltPath
	if stdin != "" {
		cmd.Stdin = strings.NewReader(stdin)
	}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		h.emitPluginProcessEvent(pluginProcessRuntimeEvent{
			RunID:   runID,
			Type:    "error",
			Message: translate(h.localization, "backend.error.process.startFailed", nil),
		})
		return
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		h.emitPluginProcessEvent(pluginProcessRuntimeEvent{
			RunID:   runID,
			Type:    "error",
			Message: translate(h.localization, "backend.error.process.startFailed", nil),
		})
		return
	}

	if err := cmd.Start(); err != nil {
		h.emitPluginProcessEvent(pluginProcessRuntimeEvent{
			RunID:   runID,
			Type:    "error",
			Message: translate(h.localization, "backend.error.process.startFailed", nil),
		})
		return
	}

	streamErrors := make(chan error, 2)
	var streamWG sync.WaitGroup
	streamWG.Add(2)

	go func() {
		defer streamWG.Done()
		if streamErr := h.streamPluginProcessOutput(runCtx, runID, "stdout", stdout, stdoutMode); streamErr != nil {
			select {
			case streamErrors <- streamErr:
			default:
			}
			cancel()
		}
	}()

	go func() {
		defer streamWG.Done()
		if streamErr := h.streamPluginProcessOutput(runCtx, runID, "stderr", stderr, stderrMode); streamErr != nil {
			select {
			case streamErrors <- streamErr:
			default:
			}
			cancel()
		}
	}()

	waitErr := cmd.Wait()
	streamWG.Wait()
	close(streamErrors)

	if streamErr := firstPluginProcessStreamError(streamErrors); streamErr != nil {
		if !errors.Is(runCtx.Err(), context.Canceled) {
			runtime.LogError(h.ctx, fmt.Sprintf("plugin process %s stream failed: %v", runID, streamErr))
			h.emitPluginProcessEvent(pluginProcessRuntimeEvent{
				RunID:   runID,
				Type:    "error",
				Message: translate(h.localization, "backend.error.process.streamFailed", nil),
			})
		}
		return
	}

	if errors.Is(runCtx.Err(), context.Canceled) {
		return
	}

	if waitErr != nil {
		var exitErr *exec.ExitError
		if errors.As(waitErr, &exitErr) {
			h.emitPluginProcessEvent(pluginProcessRuntimeEvent{
				RunID: runID,
				Type:  "exit",
				Code:  exitErr.ExitCode(),
			})
			return
		}

		runtime.LogError(h.ctx, fmt.Sprintf("plugin process %s failed: %v", runID, waitErr))
		h.emitPluginProcessEvent(pluginProcessRuntimeEvent{
			RunID:   runID,
			Type:    "error",
			Message: translate(h.localization, "backend.error.process.runFailed", nil),
		})
		return
	}

	h.emitPluginProcessEvent(pluginProcessRuntimeEvent{
		RunID: runID,
		Type:  "exit",
		Code:  0,
	})
}

func (h *PluginHandler) streamPluginProcessOutput(
	runCtx context.Context,
	runID string,
	eventType string,
	reader io.Reader,
	mode string,
) error {
	switch mode {
	case "lines":
		scanner := bufio.NewScanner(reader)
		scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
		for scanner.Scan() {
			select {
			case <-runCtx.Done():
				return nil
			default:
			}

			h.emitPluginProcessEvent(pluginProcessRuntimeEvent{
				RunID: runID,
				Type:  eventType,
				Data:  scanner.Text(),
			})
		}

		if err := scanner.Err(); err != nil && !errors.Is(runCtx.Err(), context.Canceled) {
			return err
		}
		return nil
	default:
		buffer := make([]byte, 4096)
		for {
			count, err := reader.Read(buffer)
			if count > 0 {
				h.emitPluginProcessEvent(pluginProcessRuntimeEvent{
					RunID: runID,
					Type:  eventType,
					Data:  string(buffer[:count]),
				})
			}

			if err != nil {
				if errors.Is(err, io.EOF) || errors.Is(runCtx.Err(), context.Canceled) {
					return nil
				}
				return err
			}
		}
	}
}

func normalizePluginProcessMode(mode string) string {
	if strings.EqualFold(strings.TrimSpace(mode), "lines") {
		return "lines"
	}
	return "raw"
}

func firstPluginProcessStreamError(streamErrors <-chan error) error {
	for err := range streamErrors {
		if err != nil {
			return err
		}
	}
	return nil
}

func (h *PluginHandler) emitPluginProcessEvent(payload pluginProcessRuntimeEvent) {
	runtime.EventsEmit(h.ctx, pluginProcessEventName, payload)
}

func (h *PluginHandler) consumeProcessCancel(runID string) (context.CancelFunc, bool) {
	h.processMu.Lock()
	defer h.processMu.Unlock()

	cancel, ok := h.processCancels[runID]
	if ok {
		delete(h.processCancels, runID)
	}
	return cancel, ok
}
