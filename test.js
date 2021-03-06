/* global it, beforeEach, describe */

const path = require('path')
const fs = require('fs')
const {assert} = require('chai')
const tempy = require('tempy')
const del = require('del')
const pkgUp = require('pkg-up')
const clearModule = require('clear-module')

const Pref = require('.')

global.require = require

beforeEach(() => {
  this.pref = new Pref({cwd: tempy.directory(), watch: false})
  this.fixture = '👾'
})

it('.get()', () => {
  assert.equal(this.pref.get('foo'), undefined)
  assert.equal(this.pref.get('foo', '🐴'), '🐴')
  this.pref.set('foo', this.fixture)
  assert.equal(this.pref.get('foo'), this.fixture)
})

describe('.set()', () => {
  it('standard', () => {
    this.pref.set('foo', this.fixture)
    this.pref.set('baz.boo', this.fixture)
    assert.equal(this.pref.get('foo'), this.fixture)
    assert.equal(this.pref.get('baz.boo'), this.fixture)
  })

  it('sets an object', () => {
    this.pref.set({
      foo1: 'bar1',
      foo2: 'bar2',
      baz: {
        boo: 'foo',
        foo: {
          bar: 'baz'
        }
      }
    })
    assert.equal(this.pref.get('foo1'), 'bar1')
    assert.equal(this.pref.get('foo2'), 'bar2')
    assert.deepEqual(this.pref.get('baz'), {boo: 'foo', foo: {bar: 'baz'}})
    assert.equal(this.pref.get('baz.boo'), 'foo')
    assert.deepEqual(this.pref.get('baz.foo'), {bar: 'baz'})
    assert.equal(this.pref.get('baz.foo.bar'), 'baz')
  })

  it('undefined', () => {
    assert.throws(
      () => this.pref.set('foo', undefined),
      'Use `delete()` to clear values'
    )
  })

  it('invalid key', () => {
    assert.throws(
      () => this.pref.set(1, 'unicorn'),
      'Expected `key` to be of type `string` or `object`, got number'
    )
  })
})

it('.has()', () => {
  this.pref.set('foo', this.fixture)
  this.pref.set('baz.boo', this.fixture)
  assert(this.pref.has('foo'))
  assert(this.pref.has('baz.boo'))
  assert.isFalse(this.pref.has('missing'))
})

it('.delete()', () => {
  const {pref} = this
  pref.set('foo', 'bar')
  pref.set('baz.boo', true)
  pref.set('baz.foo.bar', 'baz')
  pref.delete('foo')
  assert.equal(pref.get('foo'), undefined)
  pref.delete('baz.boo')
  assert.notEqual(pref.get('baz.boo'), true)
  pref.delete('baz.foo')
  assert.notEqual(pref.get('baz.foo'), {bar: 'baz'})
  pref.set('foo.bar.baz', {awesome: 'icecream'})
  pref.set('foo.bar.zoo', {awesome: 'redpanda'})
  pref.delete('foo.bar.baz')
  assert.equal(pref.get('foo.bar.zoo.awesome'), 'redpanda')
})

it('.clear()', () => {
  this.pref.set('foo', 'bar')
  this.pref.set('foo1', 'bar1')
  this.pref.set('baz.boo', true)
  this.pref.clear()
  assert.equal(this.pref.size, 0)
})

it('.size', () => {
  this.pref.set('foo', 'bar')
  assert.equal(this.pref.size, 1)
})

it('.store', () => {
  this.pref.set('foo', 'bar')
  this.pref.set('baz.boo', true)
  assert.deepEqual(this.pref.store, {
    foo: 'bar',
    baz: {
      boo: true
    }
  })
})

it('`defaults` option', () => {
  const pref = new Pref({cwd: tempy.directory(), defaults: {foo: 'bar'}})

  assert.equal(pref.get('foo'), 'bar')
})

it('`configName` option', () => {
  const configName = 'alt-config'
  const pref = new Pref({cwd: tempy.directory(), configName})
  assert.equal(pref.get('foo'), undefined)
  pref.set('foo', this.fixture)
  assert.equal(pref.get('foo'), this.fixture)
  assert.equal(path.basename(pref.path, '.json'), configName)
})

it('`fileExtension` option', () => {
  const fileExtension = 'alt-ext'
  const pref = new Pref({
    cwd: tempy.directory(),
    fileExtension
  })
  assert.equal(pref.get('foo'), undefined)
  pref.set('foo', this.fixture)
  assert.equal(pref.get('foo'), this.fixture)
  assert.equal(path.extname(pref.path), `.${fileExtension}`)
})

it('is iterable', () => {
  this.pref.set({foo: this.fixture, bar: this.fixture})
  assert.deepEqual(
    [...this.pref], [['foo', this.fixture], ['bar', this.fixture]]
  )
})

it('does not write to disk upon instantiation if store did not change', () => {
  let exists = fs.existsSync(this.pref.path)
  assert.isFalse(exists)

  const pref = new Pref({cwd: tempy.directory(), defaults: {foo: 'bar'}})
  exists = fs.existsSync(pref.path)
  assert(exists)
})

it('`projectName` option', () => {
  const projectName = 'pref-fixture-project-name'
  const pref = new Pref({projectName})
  assert.equal(pref.get('foo'), undefined)
  pref.set('foo', this.fixture)
  assert.equal(pref.get('foo'), this.fixture)
  assert(pref.path.includes(projectName))
  del.sync(pref.path, {force: true})
})

it('ensure `.store` is always an object', () => {
  const cwd = tempy.directory()
  const pref = new Pref({cwd})
  del.sync(cwd, {force: true})
  assert.doesNotThrow(() => pref.get('foo'))
})

it('automatic `projectName` inference', () => {
  const pref = new Pref()
  pref.set('foo', this.fixture)
  assert.equal(pref.get('foo'), this.fixture)
  assert(pref.path.includes('conf'))
  del.sync(pref.path, {force: true})
})

it('`cwd` option overrides `projectName` option', () => {
  const cwd = tempy.directory()

  let pref
  assert.doesNotThrow(() => {
    pref = new Pref({cwd, projectName: ''})
  })

  assert(pref.path.startsWith(cwd))
  assert.equal(pref.get('foo'), undefined)
  pref.set('foo', this.fixture)
  assert.equal(pref.get('foo'), this.fixture)
  del.sync(pref.path, {force: true})
})

it('safely handle missing package.json', () => {
  const pkgUpSyncOrig = pkgUp.sync
  pkgUp.sync = () => null

  let pref
  assert.doesNotThrow(() => {
    pref = new Pref({projectName: 'pref-fixture-project-name'})
  })

  del.sync(pref.path, {force: true})
  pkgUp.sync = pkgUpSyncOrig
})

it('handle `cwd` being set and `projectName` not being set', () => {
  const pkgUpSyncOrig = pkgUp.sync
  pkgUp.sync = () => null

  let pref
  assert.doesNotThrow(() => {
    pref = new Pref({cwd: 'pref-fixture-cwd'})
  })

  del.sync(path.dirname(pref.path))
  pkgUp.sync = pkgUpSyncOrig
})

it('fallback to cwd if `module.filename` is `null`', () => {
  const preservedFilename = module.filename
  module.filename = null
  clearModule('.')

  let pref
  assert.doesNotThrow(() => {
    const Pref = require('.')
    pref = new Pref({cwd: 'pref-fixture-fallback-module-filename-null'})
  })

  module.filename = preservedFilename
  del.sync(path.dirname(pref.path))
})

it('onDidChange()', done => {
  const {pref} = this

  const checkFoo = (newValue, oldValue) => {
    assert.equal(newValue, '🐴')
    assert.equal(oldValue, this.fixture)
  }

  const checkBaz = (newValue, oldValue) => {
    assert.equal(newValue, '🐴')
    assert.equal(oldValue, this.fixture)
  }

  pref.set('foo', this.fixture)
  let disposable = pref.onDidChange('foo', checkFoo)
  pref.set('foo', '🐴')
  disposable.dispose()
  pref.set('foo', this.fixture)

  pref.set('baz.boo', this.fixture)
  disposable = pref.onDidChange('baz.boo', checkBaz)
  pref.set('baz.boo', '🐴')
  disposable.dispose()
  pref.set('baz.boo', this.fixture)

  const checkUndefined = (newValue, oldValue) => {
    assert.equal(oldValue, this.fixture)
    assert.equal(newValue, undefined)
  }
  const checkSet = (newValue, oldValue) => {
    assert.equal(oldValue, undefined)
    assert.equal(newValue, '🐴')
    done()
  }

  disposable = pref.onDidChange('foo', checkUndefined)
  pref.delete('foo')
  disposable.dispose()
  disposable = pref.onDidChange('foo', checkSet)
  pref.set('foo', '🐴')
  disposable.dispose()
  pref.set('foo', this.fixture)
})

it('watch()', done => {
  const cwd = tempy.directory()
  const pref1 = new Pref({cwd})

  pref1.set('foo', '👾')

  pref1.onDidChange('foo', (newValue, oldValue) => {
    assert.equal(newValue, '🐴')
    assert.equal(oldValue, '👾')
    pref2.set('foo', '👾')
    done()
  })

  const pref2 = new Pref({cwd})
  assert.equal(pref2.get('foo'), '👾')
  assert.equal(pref1.path, pref2.path)
  pref2.set('foo', '🐴')
})

describe('migrations', () => {
  it('does not set version without migrations', () => {
    assert.isUndefined(this.pref.get('version'))
  })

  it('sets the version initially', () => {
    const pref = new Pref({migrations: true})
    assert.equal(pref.get('version'), require('./package.json').version)
  })

  it('sets the version initially', () => {
    const pref = new Pref({
      migrations: {
        '15.0.0': store => {
          store.set('doAThing', 1)
        },
        '15.0.1': store => {
          store.set('dontDoAThing', 1)
        }
      },
      packageVersion: '15.0.0'
    })
    assert.equal(pref.get('version'), '15.0.0')
    assert.equal(pref.get('doAThing'), 1)
    assert.isUndefined(pref.get('dontDoAThing'))
  })

  it('migrates to the next version', () => {
    const cwd = tempy.directory()

    const pref1 = new Pref({cwd})
    pref1.set('version', '1.0.0')
    pref1.set('old', 'old')

    const pref2 = new Pref({
      cwd,
      migrations: {
        '0.0.3': store => {
          store.set('03', 1)
        },
        '1.0.1': store => {
          const old = store.get('old')
          store.set('new', old)
          store.delete('old')
        },
        '2.0.0': store => {
          store.set('2', 1)
        },
        '4.0.0': store => {
          store.set('4', 1)
        }
      }
    })

    assert.isUndefined(pref2.get('old'))
    assert.isUndefined(pref2.get('03'))
    assert.isUndefined(pref2.get('4'))
    assert.equal(pref2.get('new'), 'old')
    assert.equal(pref2.get('2'), 1)
    assert.equal(pref2.get('version'), require('./package.json').version)
  })
})

describe('schema', () => {
  it('is not valid', () => {
    const schema = {
      type: 'object',
      properties: {foo: {type: 'number'}, bar: {type: 'boolean'}}
    }
    const pref = new Pref({
      schema,
      cwd: tempy.directory(),
      watch: false,
      defaults: {foo: {}, bar: []}
    })

    assert.isFalse(pref.isValid())
  })

  it('coerces the store', () => {
    const schema = {
      type: 'object',
      properties: {foo: {type: 'number'}, bar: {type: 'boolean'}}
    }
    const pref = new Pref({
      schema,
      cwd: tempy.directory(),
      watch: false,
      defaults: {foo: '12', bar: 'false'}
    })

    assert.equal(pref.get('foo'), 12)
    assert.equal(pref.get('bar'), false)
  })

  it('returns uncoerced value when validation fails', () => {
    const schema = {
      type: 'object',
      properties: {foo: {type: 'number'}, bar: {type: 'boolean'}}
    }
    const pref = new Pref({
      schema,
      cwd: tempy.directory(),
      watch: false,
      defaults: {foo: {}, bar: 'false'}
    })

    assert.deepEqual(pref.get('foo'), {})
    assert.isFalse(pref.isValid())
  })

  it('fails validation when color fails', () => {
    const schema = {
      type: 'object',
      properties: {foo: {type: 'string', color: true}}
    }
    const pref = new Pref({
      schema,
      cwd: tempy.directory(),
      watch: false,
      defaults: {foo: '24'}
    })

    assert.isFalse(pref.isValid())
  })

  it('coerces string to color', () => {
    const schema = {
      type: 'object',
      properties: {foo: {type: 'string', color: true}}
    }
    const pref = new Pref({
      schema,
      cwd: tempy.directory(),
      watch: false,
      defaults: {foo: '#fff'}
    })

    assert.equal(pref.get('foo'), 'rgb(255, 255, 255)')
    assert(pref.isValid())
  })
})
