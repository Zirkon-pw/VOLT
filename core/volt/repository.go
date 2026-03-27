package volt

type Repository interface {
	List() ([]Volt, error)
	GetByID(id string) (*Volt, error)
	Create(volt *Volt) error
	Delete(id string) error
	Save(volts []Volt) error
}
