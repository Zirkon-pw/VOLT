package volt

import "errors"

var (
	ErrNotFound          = errors.New("volt not found")
	ErrPathNotAccessible = errors.New("volt path is not accessible")
	ErrAlreadyExists     = errors.New("volt with this path already exists")
)
