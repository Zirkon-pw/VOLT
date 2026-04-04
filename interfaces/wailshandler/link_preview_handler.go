package wailshandler

import (
	"context"

	commandbase "volt/commands"
	commandssystem "volt/commands/system"
	coresettings "volt/core/settings"
)

type LinkPreviewHandler struct {
	manager      *commandbase.Manager
	localization *coresettings.LocalizationService
}

func NewLinkPreviewHandler(
	manager *commandbase.Manager,
	localization *coresettings.LocalizationService,
) *LinkPreviewHandler {
	return &LinkPreviewHandler{
		manager:      manager,
		localization: localization,
	}
}

func (h *LinkPreviewHandler) ResolveLinkPreview(url string) (commandssystem.ResolveLinkPreviewResponse, error) {
	result, err := commandbase.Execute[commandssystem.ResolveLinkPreviewResponse](
		context.Background(),
		h.manager,
		commandssystem.ResolveLinkPreviewName,
		commandssystem.ResolveLinkPreviewRequest{URL: url},
	)
	if err != nil {
		return commandssystem.ResolveLinkPreviewResponse{}, localizedUnexpectedError(h.localization, "backend.action.resolveLinkPreview", nil, err)
	}

	return result, nil
}
